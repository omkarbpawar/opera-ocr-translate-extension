const loader = document.getElementById("loader")
const login = document.getElementById("login-screen")
const extension = document.getElementById("extension")
let page = "home"
let feedbackPage = "send"
let hasReply = false

const languages = {
    af: "Afrikaans",
    sq: "Albanian",
    am: "Amharic",
    ar: "Arabic",
    hy: "Armenian",
    as: "Assamese",
    ay: "Aymara",
    az: "Azerbaijani",
    bm: "Bambara",
    eu: "Basque",
    be: "Belarusian",
    bn: "Bengali",
    bho: "Bhojpuri",
    bs: "Bosnian",
    bg: "Bulgarian",
    ca: "Catalan",
    ceb: "Cebuano",
    ny: "Chichewa",
    zh: "Chinese",
    co: "Corsican",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    dv: "Divehi",
    doi: "Dogri",
    nl: "Dutch",
    en: "English",
    eo: "Esperanto",
    et: "Estonian",
    ee: "Ewe",
    fil: "Filipino",
    fi: "Finnish",
    fr: "French",
    fy: "Frisian",
    gl: "Galician",
    lg: "Ganda",
    ka: "Georgian",
    de: "German",
    el: "Greek",
    gn: "Guarani",
    gu: "Gujarati",
    ht: "Haitian",
    ha: "Hausa",
    haw: "Hawaiian",
    he: "Hebrew",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hungarian",
    is: "Icelandic",
    ig: "Igbo",
    ilo: "Iloko",
    id: "Indonesian",
    ga: "Irish",
    it: "Italian",
    ja: "Japanese",
    jv: "Javanese",
    kn: "Kannada",
    kk: "Kazakh",
    km: "Khmer",
    rw: "Kinyarwanda",
    gom: "Konkani",
    ko: "Korean",
    kri: "Krio",
    ku: "Kurmanji",
    ckb: "Sorani",
    ky: "Kyrgyz",
    lo: "Lao",
    la: "Latin",
    lv: "Latvian",
    ln: "Lingala",
    lt: "Lithuanian",
    lb: "Luxembourgish",
    mk: "Macedonian",
    mai: "Maithili",
    mg: "Malagasy",
    ms: "Malay",
    ml: "Malayalam",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    lus: "Mizo",
    mn: "Mongolian",
    my: "Burmese",
    ne: "Nepali",
    nso: "Sotho",
    no: "Norwegian",
    or: "Odia",
    om: "Oromo",
    ps: "Pashto",
    fa: "Persian",
    pl: "Polish",
    pt: "Portuguese",
    pa: "Punjabi",
    qu: "Quechua",
    ro: "Romanian",
    ru: "Russian",
    sm: "Samoan",
    sa: "Sanskrit",
    gd: "Scottish",
    sr: "Serbian",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovak",
    sl: "Slovenian",
    so: "Somali",
    es: "Spanish",
    su: "Sundanese",
    sw: "Swahili",
    sv: "Swedish",
    tg: "Tajik",
    ta: "Tamil",
    tt: "Tatar",
    te: "Telugu",
    th: "Thai",
    ti: "Tigrinya",
    ts: "Tsonga",
    tr: "Turkish",
    tk: "Turkmen",
    ak: "Twi",
    uk: "Ukrainian",
    ur: "Urdu",
    ug: "Uyghur",
    uz: "Uzbek",
    vi: "Vietnamese",
    cy: "Welsh",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
}

const sourceLanguageSelect = document.getElementById("source-language")
const targetLanguageSelect = document.getElementById("target-language")
chrome.storage.sync.get({ torii_target_lang: "en", torii_source_lang: "auto", torii_email: "", torii_error: false }, (result) => {
    const targetLanguage = result["torii_target_lang"]
    const sourceLanguage = result["torii_source_lang"]
    const userEmail = result["torii_email"]
    const toriiError = result["torii_error"]

    if (toriiError) {
        displayError(toriiError)

        chrome.storage.sync.set({ torii_error: false })
    }

    document.getElementById("email-input").value = userEmail

    const autoOption = document.createElement("option")
    autoOption.value = "auto"
    autoOption.text = "auto detect"

    if (sourceLanguage == "auto") {
        autoOption.selected = true
    }

    sourceLanguageSelect.appendChild(autoOption)

    for (const [key, value] of Object.entries(languages)) {
        const targetOption = document.createElement("option")
        const sourceOption = document.createElement("option")

        targetOption.value = key
        targetOption.text = value

        sourceOption.value = key
        sourceOption.text = value

        if (key == targetLanguage) {
            targetOption.selected = true
        }

        if (key == sourceLanguage) {
            sourceOption.selected = true
        }

        sourceLanguageSelect.appendChild(sourceOption)
        targetLanguageSelect.appendChild(targetOption)
    }
})

document.getElementById("target-language").addEventListener("change", (event) => {
    chrome.storage.sync.set({ torii_target_lang: event.target.value })
})

document.getElementById("source-language").addEventListener("change", (event) => {
    chrome.storage.sync.set({ torii_source_lang: event.target.value })
})

document.getElementById("translation-model").addEventListener("change", (event) => {
    chrome.storage.sync.set({ translation_model: event.target.value })
})

chrome.runtime.sendMessage({ type: "user", sender: "popup" }, (response) => {
    if (response.success) {
        showExtension(response)
        initialize()
    } else {
        login.classList.remove("hidden")
        login.classList.add("flex")
    }

    loader.classList.add("hidden")
    loader.classList.remove("flex")
})

document.getElementById("login-with-google-btn").addEventListener("click", async function () {
    loader.classList.add("flex")
    loader.classList.remove("hidden")

    login.classList.add("hidden")
    login.classList.remove("flex")

    document.getElementById("login-error").classList.replace("flex", "hidden")
    document.getElementById("login-info").classList.replace("flex", "hidden")

    chrome.runtime.sendMessage({ type: "login", screenWidth: window.screen.width, screenHeight: window.screen.height }, (response) => {
        if (response.success) {
            showExtension(response)
            initialize()

            login.classList.add("hidden")
            login.classList.remove("flex")
        } else {
            login.classList.remove("hidden")
            login.classList.add("flex")

            displayError(`${response.content.error}`)
        }

        loader.classList.add("hidden")
        loader.classList.remove("flex")
    })
})

document.getElementById("login-with-email-btn").addEventListener("click", async function () {
    document.getElementById("login-error").classList.replace("flex", "hidden")
    document.getElementById("login-info").classList.replace("flex", "hidden")

    chrome.runtime.sendMessage({ type: "email", email: document.getElementById("email-input").value }, (response) => {
        if (response.success) {
            displayInfo("Sign-in link sent. <br> Check your email's inbox.")
        } else {
            displayError(`${response.content.error}`)
        }
    })
})

function displayInfo(message, timeout = 0) {
    const info = document.getElementById("login-info")

    info.classList.replace("hidden", "flex")
    info.innerHTML = message

    if (timeout > 0) {
        setTimeout(() => {
            info.classList.replace("flex", "hidden")
        }, timeout)
    }
}

function displayError(message, timeout = 0) {
    const error = document.getElementById("login-error")

    error.innerHTML = message
    error.classList.replace("hidden", "flex")

    if (timeout > 0) {
        setTimeout(() => {
            error.classList.replace("flex", "hidden")
        }, timeout)
    }
}

document.getElementById("extension-home-button").addEventListener("click", function () {
    if (page !== "home") {
        const extensionHome = document.getElementById("extension-home")
        const extensionPage = document.getElementById(`extension-${page}`)
        const extensionHomeImage = document.getElementById("home-image")
        const extensionPageImage = document.getElementById(`${page}-image`)
        const extensionHomeText = document.getElementById("home-text")
        const extensionPageText = document.getElementById(`${page}-text`)

        extensionHome.classList.remove("hidden")
        extensionHome.classList.add("flex")
        extensionHomeImage.src = "../images/home-selected.svg"
        extensionHomeText.classList.remove("text-gray")
        extensionHomeText.classList.add("text-blue")
        extensionPageImage.src = `../images/${page}.svg`
        extensionPageText.classList.remove("text-blue")
        extensionPageText.classList.add("text-gray")
        extensionPage.classList.remove("flex")
        extensionPage.classList.add("hidden")

        page = "home"
    }
})

document.getElementById("extension-feedback-button").addEventListener("click", function () {
    if (page !== "feedback") {
        const extensionFeedback = document.getElementById("extension-feedback")
        const extensionPage = document.getElementById(`extension-${page}`)
        const extensionFeedbackImage = document.getElementById("feedback-image")
        const extensionPageImage = document.getElementById(`${page}-image`)
        const extensionFeedbackText = document.getElementById("feedback-text")
        const extensionPageText = document.getElementById(`${page}-text`)

        extensionFeedback.classList.remove("hidden")
        extensionFeedback.classList.add("flex")
        extensionFeedbackImage.src = "../images/feedback-selected.svg"
        extensionFeedbackText.classList.remove("text-gray")
        extensionFeedbackText.classList.add("text-blue")
        extensionPageImage.src = `../images/${page}.svg`
        extensionPageText.classList.remove("text-blue")
        extensionPageText.classList.add("text-gray")
        extensionPage.classList.remove("flex")
        extensionPage.classList.add("hidden")

        page = "feedback"

        getFeedbackReplies()
    }
})

function getFeedbackReplies() {
    chrome.runtime.sendMessage({ type: "feedback_replies" }, (response) => {
        if (response.success) {
            const feedbackInbox = document.getElementById("feedback-inbox")
            feedbackInbox.innerHTML = ""

            for (const doc of response.content.replies) {
                const inboxElement = document.createElement("div")
                inboxElement.classList.add("reply")
                inboxElement.innerText = "RE: " + doc.feedback

                inboxElement.addEventListener("click", function (e) {
                    const feedbackReplyTitle = document.getElementById("feedback-reply-title")
                    const feedbackSwitchBack = document.getElementById("feedback-switch-back")
                    const feedbackSwitchSend = document.getElementById("feedback-switch-send")
                    const feedbackReply = document.getElementById("feedback-reply")
                    const feedbackInboxTitle = document.getElementById("feedback-inbox-title")

                    feedbackSwitchBack.classList.remove("hidden")
                    feedbackSwitchSend.classList.add("hidden")

                    feedbackReply.classList.remove("hidden")
                    feedbackInbox.classList.add("hidden")

                    feedbackInboxTitle.classList.add("hidden")
                    feedbackReplyTitle.classList.remove("hidden")
                    feedbackReplyTitle.innerText = "RE: " + doc.feedback
                    feedbackReply.innerHTML = doc.reply

                    feedbackPage = "back"

                    if (!doc.seen) {
                        chrome.runtime.sendMessage({ type: "reply_read", feedback_id: doc.id }, (response) => {
                            if (response.success) {
                                e.target.style.fontWeight = "normal"
                            }
                        })
                    }
                })

                if (doc.seen) {
                    inboxElement.style.fontWeight = "normal"
                }

                feedbackInbox.appendChild(inboxElement)
            }
        }
    })
}

document.getElementById("extension-settings-button").addEventListener("click", function () {
    if (page !== "settings") {
        const extensionSettings = document.getElementById("extension-settings")
        const extensionPage = document.getElementById(`extension-${page}`)
        const extensionSettingsImage = document.getElementById("settings-image")
        const extensionPageImage = document.getElementById(`${page}-image`)
        const extensionSettingsText = document.getElementById("settings-text")
        const extensionPageText = document.getElementById(`${page}-text`)

        extensionSettings.classList.remove("hidden")
        extensionSettings.classList.add("flex")
        extensionSettingsImage.src = "../images/settings-selected.svg"
        extensionSettingsText.classList.remove("text-gray")
        extensionSettingsText.classList.add("text-blue")
        extensionPageImage.src = `../images/${page}.svg`
        extensionPageText.classList.remove("text-blue")
        extensionPageText.classList.add("text-gray")
        extensionPage.classList.remove("flex")
        extensionPage.classList.add("hidden")

        page = "settings"
    }
})

document.getElementById("extension-feedback-submit").addEventListener("click", function () {
    const textarea = document.getElementById("feedback-textarea")
    if (textarea.value !== "") {
        chrome.runtime.sendMessage({ type: "feedback", feedback: textarea.value }, (response) => {
            if (response.success) {
                textarea.value = ""

                const feedbackMessage = document.getElementById("feedback-success")
                feedbackMessage.classList.remove("hidden")
                feedbackMessage.classList.add("flex")

                setInterval(() => {
                    feedbackMessage.classList.add("hidden")
                    feedbackMessage.classList.remove("flex")
                }, 3000)
            } else {
                const feedbackMessage = document.getElementById("feedback-error")
                feedbackMessage.classList.remove("hidden")
                feedbackMessage.classList.add("flex")

                setInterval(() => {
                    feedbackMessage.classList.add("hidden")
                    feedbackMessage.classList.remove("flex")
                }, 3000)
            }
        })
    }
})

document.getElementById("extension-default-enabled").addEventListener("change", (event) => {
    const enabled = toggleExtensionDefault()

    chrome.storage.sync.set({ torii_default_enabled: enabled })
})

document.getElementById("extension-default-visible").addEventListener("change", (event) => {
    const visible = toggleExtensionDefaultVisible()

    chrome.storage.sync.set({ torii_default_visible: visible })
})

document.getElementById("extension-enabled").addEventListener("change", (event) => {
    const enabled = toggleExtension()

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        chrome.storage.sync.set({ ["torii_" + tabs[0].url.split("/")[2]]: enabled })
    })
})

document.getElementById("font").addEventListener("change", (event) => {
    let value = event.target.value

    chrome.storage.sync.set({ torii_font: value })
})

document.getElementById("extension-updates").addEventListener("click", (event) => {
    chrome.runtime.sendMessage({ type: "update_seen" }, (response) => {
        if (response.success) {
            chrome.storage.sync.set({ torii_new_version: false })
        }
    })
})

document.getElementById("feedback-switch").addEventListener("click", (event) => {
    const feedbackSwitchSend = document.getElementById("feedback-switch-send")
    const feedbackSwitchInbox = document.getElementById("feedback-switch-inbox")
    const feedbackSwitchBack = document.getElementById("feedback-switch-back")
    const feedbackSendTitle = document.getElementById("feedback-send-title")
    const feedbackInboxTitle = document.getElementById("feedback-inbox-title")
    const feedbackReplyTitle = document.getElementById("feedback-reply-title")
    const feedbackButton = document.getElementById("feedback-send-button")
    const feedbackInbox = document.getElementById("feedback-inbox")
    const feedbackTextarea = document.getElementById("feedback-textarea")
    const feedbackReply = document.getElementById("feedback-reply")

    if (feedbackPage === "send") {
        feedbackSwitchSend.classList.remove("hidden")
        feedbackSwitchInbox.classList.add("hidden")
        feedbackSendTitle.classList.add("hidden")
        feedbackInboxTitle.classList.remove("hidden")
        feedbackButton.classList.add("hidden")
        feedbackTextarea.classList.add("hidden")
        feedbackInbox.classList.remove("hidden")
        feedbackInbox.classList.add("flex")
        feedbackPage = "inbox"

        if (hasReply) {
            chrome.runtime.sendMessage({ type: "replies_seen" }, (response) => {
                if (response.success) {
                    hasReply = false

                    for (const element of document.getElementsByClassName("reply-badge")) {
                        element.classList.add("hidden")
                        element.classList.remove("flex")
                    }
                }
            })
        }
    } else if (feedbackPage === "inbox") {
        feedbackSwitchSend.classList.add("hidden")
        feedbackSwitchInbox.classList.remove("hidden")
        feedbackSendTitle.classList.remove("hidden")
        feedbackInboxTitle.classList.add("hidden")
        feedbackButton.classList.remove("hidden")
        feedbackTextarea.classList.remove("hidden")
        feedbackInbox.classList.add("hidden")
        feedbackInbox.classList.remove("flex")
        feedbackPage = "send"
    } else if (feedbackPage === "back") {
        feedbackSwitchBack.classList.add("hidden")
        feedbackSwitchSend.classList.remove("hidden")
        feedbackInboxTitle.classList.remove("hidden")
        feedbackReplyTitle.classList.add("hidden")
        feedbackReply.classList.add("hidden")
        feedbackInbox.classList.remove("hidden")
        feedbackPage = "inbox"
    }
})

function showExtension(response) {
    if (response.content.hasReply) {
        for (const element of document.getElementsByClassName("reply-badge")) {
            element.classList.remove("hidden")
            element.classList.add("flex")
        }

        hasReply = true
    }

    extension.classList.remove("hidden")
    extension.classList.add("flex")

    const subscriptions_status = response.content.subscription?.status

    if (response.content.plan.includes("subscriber") && subscriptions_status) {
        const upgrade = document.getElementById("upgrade")
        const creds = document.getElementById("credits-area")
        const plan = document.getElementById("plan")
        const countdownArea = document.getElementById("countdown-area")
        const countdownText = document.getElementById("countdown-text")
        const countdown = document.getElementById("countdown")

        countdownArea.classList.remove("hidden")
        countdownArea.classList.add("flex")

        if (subscriptions_status == "active") {
            countdownText.innerText = "Subscription renews in: "

            countdown.innerText = countdownString(response.content.subscription.renews_at)
            setInterval(() => {
                countdown.innerText = countdownString(response.content.subscription.renews_at)
            }, 1000);
        } else if (subscriptions_status == "cancelled") {
            countdownText.innerText = "Subscription ends in: "

            countdown.innerText = countdownString(response.content.subscription.ends_at)
            setInterval(() => {
                countdown.innerText = countdownString(response.content.subscription.ends_at)
            }, 1000);
        } else if (subscriptions_status == "failed" || subscriptions_status == "unpaid" || subscriptions_status == "past_due") {
            countdownText.innerText = "Subscription renewal failed. Manage your subscription."
        }

        plan.innerHTML = "MONTHLY"
        plan.title = response.content.subscription?.item || "Monthly subscription"
        upgrade.innerHTML = "MANAGE"
        upgrade.title = "Link to subscription management page"
        upgrade.href = "https://torii.lemonsqueezy.com/billing"
        creds.title = `Subscription credits: ${formatCredits(response.content.subscription.credits)}\nOne-time credits: ${formatCredits(response.content.credits)}`
    } else if (response.content.plan == "paid") {
        document.getElementById("plan").innerHTML = "PAID PLAN"
        document.getElementById("upgrade").innerHTML = "BUY MORE"
    } else {
        document.getElementById("plan").innerHTML = "FREE TRIAL"
        document.getElementById("upgrade").innerHTML = "UPGRADE"
    }

    let totalCredits = response.content.credits
    if (subscriptions_status) totalCredits += response.content.subscription.credits

    document.getElementById("credits").innerHTML = formatCredits(totalCredits)
}

function formatCredits(credits) {
    if (credits < 10000) return credits.toFixed(2)
    if (credits < 100000) return credits.toFixed(1)
    return credits.toFixed(0)
}

function toggleExtension(checked = null) {
    const checkbox = document.getElementById("extension-enabled")
    const switch_inner = checkbox.parentElement

    if (checked === true) {
        checkbox.checked = true

        switch_inner.classList.add("bg-blue")
        switch_inner.classList.remove("bg-gray")

        const on_text = document.getElementById("extension-on")
        const off_text = document.getElementById("extension-off")

        on_text.classList.add("on-on")
        on_text.classList.remove("on-off")
        off_text.classList.add("off-on")
        off_text.classList.remove("off-off")

        const status_text = document.getElementById("extension-status-text")

        status_text.innerText = "Enabled"

        status_text.classList.add("text-blue")
        status_text.classList.remove("text-red")

        return true
    } else if (checked === false) {
        checkbox.checked = false

        switch_inner.classList.remove("bg-blue")
        switch_inner.classList.add("bg-gray")

        const on_text = document.getElementById("extension-on")
        const off_text = document.getElementById("extension-off")

        on_text.classList.remove("on-on")
        on_text.classList.add("on-off")
        off_text.classList.remove("off-on")
        off_text.classList.add("off-off")

        const status_text = document.getElementById("extension-status-text")

        status_text.innerText = "Disabled"

        status_text.classList.remove("text-blue")
        status_text.classList.add("text-red")

        return false
    }

    switch_inner.classList.toggle("bg-blue")
    switch_inner.classList.toggle("bg-gray")

    const on_text = document.getElementById("extension-on")
    const off_text = document.getElementById("extension-off")

    on_text.classList.toggle("on-on")
    on_text.classList.toggle("on-off")
    off_text.classList.toggle("off-on")
    off_text.classList.toggle("off-off")

    const status_text = document.getElementById("extension-status-text")

    if (checkbox.checked) {
        status_text.innerText = "Enabled"
    } else {
        status_text.innerText = "Disabled"
    }

    status_text.classList.toggle("text-blue")
    status_text.classList.toggle("text-red")

    return checkbox.checked
}

function toggleExtensionDefault(checked = null) {
    const checkbox = document.getElementById("extension-default-enabled")
    const switch_inner = checkbox.parentElement

    if (checked === true) {
        checkbox.checked = true

        switch_inner.classList.add("bg-blue")
        switch_inner.classList.remove("bg-gray")

        const on_text = document.getElementById("extension-default-on")
        const off_text = document.getElementById("extension-default-off")

        on_text.classList.add("on-on")
        on_text.classList.remove("on-off")
        off_text.classList.add("off-on")
        off_text.classList.remove("off-off")

        const status_text = document.getElementById("extension-default-status-text")

        status_text.innerText = "Enabled"

        status_text.classList.add("text-blue")
        status_text.classList.remove("text-red")

        return true
    } else if (checked === false) {
        checkbox.checked = false

        switch_inner.classList.remove("bg-blue")
        switch_inner.classList.add("bg-gray")

        const on_text = document.getElementById("extension-default-on")
        const off_text = document.getElementById("extension-default-off")

        on_text.classList.remove("on-on")
        on_text.classList.add("on-off")
        off_text.classList.remove("off-on")
        off_text.classList.add("off-off")

        const status_text = document.getElementById("extension-default-status-text")

        status_text.innerText = "Disabled"

        status_text.classList.remove("text-blue")
        status_text.classList.add("text-red")

        return false
    }

    switch_inner.classList.toggle("bg-blue")
    switch_inner.classList.toggle("bg-gray")

    const on_text = document.getElementById("extension-default-on")
    const off_text = document.getElementById("extension-default-off")

    on_text.classList.toggle("on-on")
    on_text.classList.toggle("on-off")
    off_text.classList.toggle("off-on")
    off_text.classList.toggle("off-off")

    const status_text = document.getElementById("extension-default-status-text")

    if (checkbox.checked) {
        status_text.innerText = "Enabled"
    } else {
        status_text.innerText = "Disabled"
    }

    status_text.classList.toggle("text-blue")
    status_text.classList.toggle("text-red")

    return checkbox.checked
}

function toggleExtensionDefaultVisible(checked = null) {
    const checkbox = document.getElementById("extension-default-visible")
    const switch_inner = checkbox.parentElement

    if (checked === true) {
        checkbox.checked = true

        switch_inner.classList.add("bg-blue")
        switch_inner.classList.remove("bg-gray")

        const on_text = document.getElementById("extension-visible-on")
        const off_text = document.getElementById("extension-visible-off")

        on_text.classList.add("on-on")
        on_text.classList.remove("on-off")
        off_text.classList.add("off-on")
        off_text.classList.remove("off-off")

        const status_text = document.getElementById("extension-visible-status-text")

        status_text.innerText = "Visible always"

        return true
    } else if (checked === false) {
        checkbox.checked = false

        switch_inner.classList.remove("bg-blue")
        switch_inner.classList.add("bg-gray")

        const on_text = document.getElementById("extension-visible-on")
        const off_text = document.getElementById("extension-visible-off")

        on_text.classList.remove("on-on")
        on_text.classList.add("on-off")
        off_text.classList.remove("off-on")
        off_text.classList.add("off-off")

        const status_text = document.getElementById("extension-visible-status-text")

        status_text.innerText = "Visible on hover"

        return false
    }

    switch_inner.classList.toggle("bg-blue")
    switch_inner.classList.toggle("bg-gray")

    const on_text = document.getElementById("extension-visible-on")
    const off_text = document.getElementById("extension-visible-off")

    on_text.classList.toggle("on-on")
    on_text.classList.toggle("on-off")
    off_text.classList.toggle("off-on")
    off_text.classList.toggle("off-off")

    const status_text = document.getElementById("extension-visible-status-text")

    if (checkbox.checked) {
        status_text.innerText = "Visible always"
    } else {
        status_text.innerText = "Visible on hover"
    }

    return checkbox.checked
}

function setTranslationModel(model) {
    document.getElementById("translation-model").value = model
}

function setFont(font) {
    document.getElementById("font").value = font
}

function toggleUpdateBadges(beenUpdated) {
    const badges = document.getElementsByClassName("update-badge")

    if (beenUpdated) {
        for (const badge of badges) {
            badge.classList.remove("hidden")
            badge.classList.add("flex")
        }
    } else {
        for (const badge of badges) {
            badge.classList.remove("flex")
            badge.classList.add("hidden")
        }
    }
}

function initialize() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        let stored_url = "torii_extension"
        try {
            stored_url = "torii_" + tabs[0].url.split("/")[2]
        } catch (error) {
            console.log("Focused window is extension.")
        }

        chrome.storage.sync.get(
            {
                [stored_url]: "na",
                torii_default_enabled: true,
                torii_default_visible: "na",
                translation_model: "gpt-4o-mini",
                torii_new_version: false,
                torii_font: "wildwords"
            },
            (result) => {
                setTranslationModel(result["translation_model"])
                setFont(result["torii_font"])
                toggleExtensionDefault(result["torii_default_enabled"])
                if (result["torii_default_visible"] == "na") {
                    toggleExtensionDefaultVisible(isMobile())
                } else {
                    toggleExtensionDefaultVisible(result["torii_default_visible"])
                }
                toggleUpdateBadges(result["torii_new_version"])
                if (result[stored_url] == "na") {
                    toggleExtension(result["torii_default_enabled"])
                } else {
                    toggleExtension(result[stored_url])
                }
            }
        )
    })
}

function countdownString(until) {
    const date = new Date(until)
    const now = new Date()

    const distance = date - now

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((distance % (1000 * 60)) / 1000)

    const countdownString = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`

    return countdownString
}

function isMobile() {
    const userAgentDataMobile = navigator?.userAgentData?.mobile

    if (userAgentDataMobile === undefined) {
        return navigator.userAgent.toLowerCase().includes("mobile")
    }

    return userAgentDataMobile
}