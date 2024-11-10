import {
  initializeApp,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  signOut,
  collection,
  query,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  initializeFirestore,
  where,
  updateDoc,
  orderBy
} from "./firebase.js"

const firebaseConfig = {
  apiKey: "AIzaSyB_qiJGMFVc2hab1Gqk0nIvicdrswmOMOU",
  authDomain: "torii-image-translator.firebaseapp.com",
  projectId: "torii-image-translator",
  storageBucket: "torii-image-translator.appspot.com",
  messagingSenderId: "7062330756",
  appId: "1:7062330756:web:ab07bef7254b1cc0eb11d1",
  measurementId: "G-V4S47Z5WZP",
}

let initialized = false
let currentUser = null
let loginResult = null
let receivedLoginResult = false
let sentErrors = 0
const app = initializeApp(firebaseConfig)
const db = initializeFirestore(app, { experimentalForceLongPolling: true })
const auth = getAuth(app)

auth.onAuthStateChanged((user) => {
  if (user) {
      currentUser = user
  } else {
      currentUser = null
  }

  initialized = true
})

async function handleMessage(msg) {
  while (!initialized) {
      await wait(100)
  }

  if (msg.type == "login") {
      try {
          if (!currentUser) {
              if (!msg.emailLink) {
                  receivedLoginResult = false
                  await signInWithGoogle(msg.screenWidth, msg.screenHeight)
              } else {
                  const signInResult = await signInWithEmail(msg.emailLink)

                  if (!signInResult.success) {
                      return signInResult
                  }

                  loginResult = msg.fp
              }
          }

          const userDataResult = await getOrCreateUserData()

          const baseCredits = userDataResult?.content?.credits || 0
          const subscriptionCredits = userDataResult?.content?.subscription?.credits || 0

          if (userDataResult.success) {
              await updateTabCredits(baseCredits + subscriptionCredits)
          } else {
              chrome.storage.sync.set({ torii_error: userDataResult.content.error })
          }

          return userDataResult
      } catch (error) {
          await sendError(error, "login extension error")

          return { success: false, content: { error: "Failed to sign in." } }
      }
  } else if (msg.type == "email") {
      if (!msg.email) return { success: false, content: { error: "Please enter an email address." } }

      try {
          await sendSignInLinkToEmail(auth, msg.email, { url: "https://toriitranslate.com/login?from=extension", handleCodeInApp: true })

          chrome.storage.sync.set({ torii_email: msg.email })

          return { success: true }
      } catch (error) {
          await sendError(error, "send sign in link to email")

          return { success: false, content: { error: error.message } }
      }
  } else if (msg.type == "google-auth-token") {
      if (!receivedLoginResult) {
          loginResult = msg.content

          receivedLoginResult = true

          return { success: true }
      }

      return { success: false }
  } else if (msg.type == "keep-alive") {
      return { success: true }
  } else if (msg.type == "user") {
      try {
          const storedCredits = await chrome.storage.session.get({ torii_credits: null })

          if (msg.sender == "content" && currentUser && storedCredits[`torii_credits`]) {
              const currentCredits = storedCredits[`torii_credits`]

              return { success: true, content: { credits: currentCredits } }
          }
      } catch (error) {
          await sendError(error, "get session credits")

          console.log("Get session credits error: ", error)
      }

      const userDataResult = await getUserData()

      if (!userDataResult.success) return { success: false, content: { error: "Failed to get user data" } }

      const baseCredits = userDataResult?.content?.credits || 0
      const subscriptionCredits = userDataResult?.content?.subscription?.credits || 0

      await updateTabCredits(baseCredits + subscriptionCredits)

      return { success: true, content: userDataResult.content }
  } else if (msg.type == "translate") {
      if (msg.url === null || msg.url === "" || msg.url === undefined) {
          await sendError(new Error("No image url."), "fetch image from: " + msg.site)

          return { success: false, content: { error: "Failed to process image." } }
      }

      if (msg.url.includes(".gif")) {
          return { success: false, content: { error: "GIFs are not supported." } }
      }

      let image = null
      let response = null
      try {
          if (msg.dataURL) {
              response = await sendImage(msg.dataURL, msg.site, false, false)
          } else {
              image = await fetch(msg.url)

              if (image.ok) {
                  const imageBlob = await image.blob()

                  response = await sendImage(imageBlob, msg.site, true, msg.isScreenshot)
              } else {
                  response = await sendImage(msg.url, msg.site, false, msg.isScreenshot)
              }
          }
      } catch (error) {
          response = await sendImage(msg.url, msg.site, false, msg.isScreenshot)
      }

      if (!response.success) {
          if (response?.content?.credits) {
              await updateTabCredits(Number(response.content.credits))
          }

          return { success: false, content: { error: response.content.error } }
      }

      try {
          const dataURL = await blobToImage(response.content.blob)
          const credits = Number(response.content.credits)

          await updateTabCredits(credits)

          return {
              success: true,
              content: {
                  url: dataURL.replace("application/octet-stream", "image/png"),
                  credits,
              },
          }
      } catch (error) {
          sendError(error, "blob to image")

          return { success: false, content: { error: "Failed to process image." } }
      }
  } else if (msg.type == "feedback") {
      if (!currentUser) return { success: false }

      const userId = currentUser.uid
      const email = currentUser.email

      try {
          await addDoc(collection(db, "feedbacks"), {
              email: email,
              uid: userId,
              feedback: msg.feedback,
              reply: "",
              seen_reply: false,
              created: new Date().toISOString(),
              seen: false,
          })

          return { success: true }
      } catch (error) {
          await sendError(error, "feedback")

          return { success: false }
      }
  } else if (msg.type == "feedback_replies") {
      if (!currentUser) return { success: false }

      const userId = currentUser.uid

      try {
          const replies = await getDocs(query(collection(db, "feedbacks"), where("uid", "==", userId), where("reply", "!=", ""), orderBy("seen_reply")))

          return {
              success: true,
              content: {
                  replies: replies.docs.map((doc) => {
                      return {
                          reply: doc.get("reply"),
                          seen: doc.get("seen_reply"),
                          feedback: doc.get("feedback"),
                          id: doc.id
                      }
                  })
              }
          }
      } catch (error) {
          await sendError(error, "feedback_replies")

          return { success: false }
      }
  } else if (msg.type == "reply_read") {
      if (!currentUser) return { success: false }

      try {
          await updateDoc(doc(db, "feedbacks", msg.feedback_id), {
              seen_reply: true
          })

          return { success: true }
      } catch (error) {
          sendError(error, "reply_read")

          return { success: false }
      }
  } else if (msg.type == "replies_seen") {
      if (!currentUser) return { success: false }

      const userId = currentUser.uid

      try {
          showBadge("")

          await updateDoc(doc(db, "users", userId), {
              has_reply: false
          })

          return { success: true }
      } catch (error) {
          sendError(error, "replies_seen")

          return { success: false }
      }
  } else if (msg.type == "update_seen") {
      try {
          removeUpdateBadge()

          return { success: true }
      } catch (error) {
          sendError(error, "update_seen")

          return { success: false }
      }
  } else if (msg.type == "error") {
      await sendError({ message: msg.message, stack: msg.stack }, msg.loc)

      return { success: true }
  } else if (msg.type == "screenshot") {
      while (true) {
          try {
              const dataURL = await chrome.tabs.captureVisibleTab(null, { format: "png" })

              return { success: true, content: { dataURL: dataURL } }
          } catch (error) {
              if (error.message.includes("exceeds")) {
                  await wait(200)
              } else {
                  console.log("Failed to capture screenshot: ", error)

                  return { success: false, content: { error: "Failed to capture screenshot." } }
              }
          }
      }
  }

  await sendError({ message: "Unknown msg: " + JSON.stringify(msg), stack: "Nothing" }, "handle message")

  return { success: false, content: { error: "Something went wrong. Contact support." } }
}

async function sendImage(data, site, isBlob, isScreenshot) {
  try {
      if (!currentUser) return { success: false, content: { error: "Not logged in." } }

      let body = null
      if (isBlob) {
          const form = new FormData()
          form.append("file", data)

          body = form
      } else {
          body = JSON.stringify({ url: data })
      }

      const settings = await chrome.storage.sync.get({
          torii_target_lang: "en",
          torii_source_lang: "auto",
          torii_font: "wildwords",
          translation_model: "gpt-4o-mini",
      })

      const token = await currentUser.getIdToken()
      const headers = {
          Authorization: "Bearer " + token,
          target_lang: settings["torii_target_lang"],
          source_lang: settings["torii_source_lang"],
          translator: settings["translation_model"],
          font: settings["torii_font"],
          image_url: site,
          is_screenshot: isScreenshot ? "true" : "false",
      }

      const response = await fetch("https://torii-image-translator-api-rg7y75rwka-ew.a.run.app/api/upload", {
          method: "POST",
          body: body,
          headers: headers,
          signal: AbortSignal.timeout(60000),
      })

      if (response.headers.get("success") === "false") {
          return {
              success: false,
              content: { error: await response.text(), credits: response.headers.get("credits") },
          }
      }

      return {
          success: true,
          content: {
              blob: await response.blob(),
              credits: response.headers.get("credits"),
          },
      }
  } catch (error) {
      await sendError(error, "send image from: " + site)

      return { success: false, content: { error: "Failed to process image." } }
  }
}

async function blobToImage(blob) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
  })
}

async function getIP() {
  try {
      const response = await fetch("https://api.ipify.org?format=json", {
          method: "GET",
          signal: AbortSignal.timeout(1000),
      })

      if (response.status === 200) {
          const json = await response.json()
          const ip = json.ip

          if (!ip) {
              return null
          }

          return ip
      }

      return null
  } catch (error) {
      return null
  }
}

async function signInWithEmail(emailLink) {
  const storageResult = await chrome.storage.sync.get({ torii_email: null })

  if (!storageResult.torii_email) {
      return { success: false, content: { error: "Failed to sign in." } }
  }

  try {
      const signInResult = await signInWithEmailLink(auth, storageResult.torii_email, emailLink)

      currentUser = signInResult.user

      return { success: true }
  } catch (error) {
      await sendError(error, "sign in with email link")

      return { success: false, content: { error: "Failed to sign in." } }
  }
}

async function signInWithGoogle(screenWidth, screenHeight) {
  try {
      let authResult = null

      if (chrome.windows) authResult = await windowsLogin(screenWidth, screenHeight)
      else if (chrome.tabs) authResult = await tabsLogin()
      else return { success: false, content: { error: "Failed to sign in." } }

      if (!authResult.success) {
          await sendError(authResult.content, "auth result")

          loginResult = null

          return { success: false, content: { error: "Failed to sign in." } }
      }

      const token = authResult.content

      const credential = GoogleAuthProvider.credential(token, null)

      const signInResult = await signInWithCredential(auth, credential)

      if (!signInResult?.user) {
          await sendError(signInResult.content.error, "get sign in user")

          return { success: false, content: { error: "Failed to sign in." } }
      }

      currentUser = signInResult.user
  } catch (error) {
      console.log("Failed to get user. Error: ", error)

      await sendError(error, "get user")
  }
}

async function windowsLogin(screenWidth, screenHeight) {
  const windowOptions = {
      url: "https://torii-image-translator.firebaseapp.com/signin",
      type: "popup",
      focused: true
  }

  if (screenWidth && screenWidth > 450) {
      windowOptions.left = Math.floor((screenWidth - 450) / 2)
      windowOptions.width = 450
  }

  if (screenHeight && screenHeight > 800) {
      windowOptions.top = Math.floor((screenHeight - 800) / 2)
      windowOptions.height = 800
  }

  try {
      await chrome.windows.create(windowOptions)
  } catch (error) {
      await chrome.windows.create({
          url: "https://torii-image-translator.firebaseapp.com/signin",
          type: "popup",
          focused: true
      })
  }

  const authResult = await new Promise((resolve, reject) => {
      let elapsedTime = 0
      const checkToken = setInterval(() => {
          console.log("Checking token...")

          elapsedTime += 100

          if (loginResult !== null) {
              clearInterval(checkToken)

              resolve(loginResult)
          }
      }, 100)
  })

  return authResult
}

async function tabsLogin() {
  await chrome.tabs.create({ url: "https://torii-image-translator.firebaseapp.com/signin" })

  const authResult = await new Promise((resolve, reject) => {
      let elapsedTime = 0
      const checkToken = setInterval(() => {
          console.log("Checking token...")

          elapsedTime += 100

          if (loginResult !== null) {
              clearInterval(checkToken)

              resolve(loginResult)
          }
      }, 100)
  })

  return authResult
}

async function getUserData() {
  try {
      if (!currentUser) return { success: false, content: { error: "Not logged in." } }

      const userDB = await getDoc(doc(db, "users", currentUser.uid))

      if (!userDB.exists()) {
          return { success: false, content: { error: "User not found." } }
      }

      const credits = userDB.get("credits")
      const plan = userDB.get("plan")
      const hasReply = userDB.get("has_reply")
      const subscription = userDB.get("subscription")

      if (hasReply) {
          showBadge("1")
      }

      return { success: true, content: { credits, plan, hasReply, subscription } }
  } catch (error) {
      await sendError(error, "get user data")

      return { success: false, content: { error: "Failed to get user data." } }
  }
}

async function getOrCreateUserData() {
  try {
      if (!currentUser) {
          await sendError({ message: "Not logged in after sign in.", stack: "None" }, "get or create user data")

          return { success: false, content: { error: "Failed to get user data." } }
      }

      const userDB = await getDoc(doc(db, "users", currentUser.uid))

      if (userDB.exists()) {
          const credits = userDB.get("credits")
          const plan = userDB.get("plan")
          const hasReply = userDB.get("has_reply")
          const subscription = userDB.get("subscription")

          if (hasReply) {
              showBadge("1")
          }

          return { success: true, content: { credits, plan, hasReply, subscription } }
      } else {
          try {
              const visitorId = loginResult?.fpData?.visitorId
              const visitorIp = loginResult?.fpData?.ip

              if (visitorId) {
                  const fingerprintDB = await getDoc(doc(db, "fingerprints", visitorId))

                  if (fingerprintDB.exists()) {
                      await signOut(auth)

                      loginResult = null

                      await sendError(new Error("Multiple accounts attempted by: " + visitorId + " on: " + visitorIp), "create fingerprint")

                      return { success: false, content: { error: "Multiple accounts not allowed. Use original account." } }
                  } else {
                      await setDoc(doc(db, "fingerprints", visitorId), {
                          created: new Date().toISOString(),
                          fingerprint: loginResult?.fpData || null
                      })
                  }
              }
          } catch (error) {
              await sendError(error, "create fingerprint")
          }

          try {
              await setDoc(doc(db, "users", currentUser.uid), {
                  email: currentUser.email,
                  credits: 10,
                  plan: "free",
                  from: "chromium",
                  is_mobile: isMobile(),
                  has_reply: false,
                  created: new Date().toISOString(),
                  meta: {
                      agent: navigator?.userAgent || null,
                      platform: navigator?.userAgentData?.platform || null,
                      brands: navigator?.userAgentData?.brands || null,
                      fingerprint: loginResult?.fpData || null,
                  }
              })

              return { success: true, content: { credits: 10, plan: "free", hasReply: false } }
          } catch (error) {
              if (error?.message?.includes?.("permissions")) {
                  const userData = await getUserData()

                  if (userData.success) {
                      return userData
                  } else {
                      await sendError({ message: error.message + " - retry after permissions fail - " + userData.content.error, stack: error.stack }, "get or create user data retry")

                      return { success: false, content: { error: "Failed to create new database user." } }
                  }
              }

              await sendError(error, "create new database user: " + currentUser?.email)

              return { success: false, content: { error: "Failed to create new database user." } }
          }
      }
  } catch (error) {
      await sendError(error, "get or create user data")

      return { success: false, content: { error: "Failed to get or create user data." } }
  }
}

async function updateTabCredits(credits) {
  if (credits === null || credits === undefined) return

  await storeCredits(credits)

  try {
      const tabs = await chrome.tabs.query({})
      tabs.forEach(function (tab) {
          chrome.tabs.sendMessage(tab.id, { type: "credits", content: { credits } }).catch(() => { })
      })
  } catch (error) {
      await sendError(error, "update tabs")

      console.log("Update tabs error: ", error)
  }
}

function showUpdateBadge() {
  showBadge("1")

  chrome.storage.sync.set({ torii_new_version: true })
}

function removeUpdateBadge() {
  showBadge("")

  chrome.storage.sync.set({ torii_new_version: false })
}

function showBadge(text) {
  try {
      chrome.action.setBadgeText({ text: text })
  } catch (error) {
      sendError(error, "show badge text")
  }

  try {
      if (text !== "") {
          chrome.action.setBadgeTextColor({ color: [255, 255, 255, 255] })
      }
  } catch (error) {
      sendError(error, "show badge text color")
  }

  try {
      if (text !== "") {
          chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] })
      }
  } catch (error) {
      sendError(error, "show badge background color")
  }
}

async function sendError(error, loc) {
  try {
      if (error?.message?.includes?.("because the client is offline")) {
          return
      }

      sentErrors += 1

      if (sentErrors > 10) {
          return
      }

      const ip = await getIP()

      let report = {
          stack_trace: error?.stack,
          message: error?.message,
          created: new Date().toISOString(),
          email: currentUser?.email,
          location: loc,
          meta: {
              agent: navigator?.userAgent || null,
              platform: navigator?.userAgentData?.platform || null,
              brands: navigator?.userAgentData?.brands || null,
          },
          ip: ip
      }

      if (loginResult?.fpData?.visitorId) {
          report.fingerprint = loginResult.fpData
      }

      const headers = {
          Authorization: "8ZjGU1PqCulQG692g-vpjQiYgStpl29suHP9OiD56psA",
      }

      await fetch("https://torii-image-translator-api-rg7y75rwka-ew.a.run.app/api/reporting", {
          method: "POST",
          body: JSON.stringify(report, (k, v) => v === undefined ? null : v),
          headers: headers,
          signal: AbortSignal.timeout(3000),
      })

  } catch (error) {
      console.log("Failed to send error. Error: ", error)
  }
}

async function storeCredits(credits) {
  try {
      await chrome.storage.session.set({ torii_credits: credits })
  } catch (error) {
      await sendError(error, "store credits")

      console.log("Failed to store credits. Error: ", error)
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMobile() {
  const userAgentDataMobile = navigator?.userAgentData?.mobile

  if (userAgentDataMobile === undefined) {
      return navigator.userAgent.toLowerCase().includes("mobile")
  }

  return userAgentDataMobile
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(error => {
      sendError(error, "on message")

      sendResponse({ success: false, content: { error: "Something went wrong. Contact support." } })
  })

  if (
      msg.type == "login" ||
      msg.type == "user" ||
      msg.type == "translate" ||
      msg.type == "feedback" ||
      msg.type == "error" ||
      msg.type == "update_seen" ||
      msg.type == "replies_seen" ||
      msg.type == "reply_read" ||
      msg.type == "feedback_replies" ||
      msg.type == "screenshot" ||
      msg.type == "google-auth-token" ||
      msg.type == "email"
  ) {
      return true
  }
})

async function setUninstallURL() {
  try {
      const url = `https://toriitranslate.com/feedback?reason=uninstall&email=${encodeURIComponent(currentUser?.email)}`
      await chrome.runtime.setUninstallURL(url)
  } catch (error) {
      await sendError(error, "set uninstall url")
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
      const currentVersion = chrome.runtime.getManifest().version
      const previousVersion = details.previousVersion
      const reason = details.reason

      if (reason == "update") {
          const previousVersionDigits = previousVersion.split(".")
          const currentVersionDigits = currentVersion.split(".")
          const significantPreviousVersionDigit = previousVersionDigits[previousVersionDigits.length - 2]
          const significantCurrentVersionDigit = currentVersionDigits[currentVersionDigits.length - 2]
          const isSignificantUpdate = significantPreviousVersionDigit != significantCurrentVersionDigit
          const sameLength = previousVersionDigits.length == currentVersionDigits.length

          if (isSignificantUpdate && sameLength) {
              showUpdateBadge()
          }
      } else if (reason == "install") {
          await setUninstallURL()
      }

  } catch (error) {
      await sendError(error, "onInstalled")
  }

  try {
      chrome.contextMenus.create({
          id: "torii_contextmenu",
          title: "Torii Image Translator",
          contexts: ["all"]
      })

      chrome.contextMenus.create({
          id: "torii_screenshot",
          title: "Screenshot (don't scroll)",
          contexts: ["all"],
          parentId: "torii_contextmenu"
      })

      chrome.contextMenus.create({
          id: "torii_separator",
          contexts: ["all"],
          type: "separator",
          parentId: "torii_contextmenu"
      })

      chrome.contextMenus.create({
          id: "torii_translate",
          title: "Translate Image",
          contexts: ["all"],
          parentId: "torii_contextmenu"
      })
  } catch (error) {
      console.log("Failed to create context menus. Error: ", error)
  }
})

try {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId == "torii_screenshot") {
          chrome.tabs.sendMessage(tab.id, { type: "contextmenu_screenshot" }).catch(() => { })
      } else if (info.menuItemId == "torii_translate") {
          chrome.tabs.sendMessage(tab.id, { type: "contextmenu_translate" }).catch(() => { })
      }
  })

  chrome.storage.sync.set({ torii_contextmenu: true })
} catch (error) {
  chrome.storage.sync.set({ torii_contextmenu: false })
}