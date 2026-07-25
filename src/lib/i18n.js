// Minimal i18n for the patient-facing check-in (English / Hindi / Telugu).
export const LANGS = [
  { code: 'en', label: 'EN', voice: 'en-US' },
  { code: 'hi', label: 'हिं', voice: 'hi-IN' },
  { code: 'te', label: 'తె', voice: 'te-IN' },
]

const STR = {
  welcome: { en: 'Welcome to Sporting Ethos', hi: 'स्पोर्टिंग एथॉस में आपका स्वागत है', te: 'స్పోర్టింగ్ ఎథోస్‌కు స్వాగతం' },
  intro: { en: "A few details and you're in the queue — takes about 20 seconds.", hi: 'कुछ जानकारी दें और कतार में शामिल हों — लगभग 20 सेकंड।', te: 'కొన్ని వివరాలు ఇచ్చి క్యూలో చేరండి — సుమారు 20 సెకన్లు.' },
  fullName: { en: 'Full name', hi: 'पूरा नाम', te: 'పూర్తి పేరు' },
  age: { en: 'Age', hi: 'उम्र', te: 'వయస్సు' },
  gender: { en: 'Gender', hi: 'लिंग', te: 'లింగం' },
  optional: { en: '(optional)', hi: '(वैकल्पिक)', te: '(ఐచ్ఛికం)' },
  male: { en: 'Male', hi: 'पुरुष', te: 'పురుషుడు' },
  female: { en: 'Female', hi: 'महिला', te: 'స్త్రీ' },
  other: { en: 'Other', hi: 'अन्य', te: 'ఇతర' },
  checkin: { en: 'Check in', hi: 'चेक इन करें', te: 'చెక్ ఇన్ చేయండి' },
  checkingIn: { en: 'Checking in…', hi: 'चेक इन हो रहा है…', te: 'చెక్ ఇన్ అవుతోంది…' },
  enterName: { en: 'Please enter your name.', hi: 'कृपया अपना नाम दर्ज करें।', te: 'దయచేసి మీ పేరు నమోదు చేయండి.' },
  secure: { en: 'Secure check-in', hi: 'सुरक्षित चेक-इन', te: 'సురక్షిత చెక్-ఇన్' },
  privacy: { en: 'Your details are used only for this visit.', hi: 'आपकी जानकारी केवल इस विज़िट के लिए उपयोग होती है।', te: 'మీ వివరాలు ఈ సందర్శన కోసం మాత్రమే వాడతారు.' },
  checkedIn: { en: "You're checked in", hi: 'आप चेक इन हो गए हैं', te: 'మీరు చెక్ ఇన్ అయ్యారు' },
  inQueue: { en: 'in queue', hi: 'कतार में', te: 'క్యూలో' },
  estWait: { en: 'estimated wait', hi: 'अनुमानित प्रतीक्षा', te: 'అంచనా నిరీక్షణ' },
  minutes: { en: 'min', hi: 'मिनट', te: 'నిమి' },
  notified: { en: 'Reception has been notified.', hi: 'रिसेप्शन को सूचित कर दिया गया है।', te: 'రిసెప్షన్‌కు తెలియజేయబడింది.' },
  yourTurn: { en: "It's your turn!", hi: 'अब आपकी बारी है!', te: 'ఇప్పుడు మీ వంతు!' },
  proceed: { en: 'Please proceed to your consultation room.', hi: 'कृपया परामर्श कक्ष में जाएँ।', te: 'దయచేసి మీ కన్సల్టేషన్ గదికి వెళ్లండి.' },
  complete: { en: 'Consultation complete', hi: 'परामर्श पूर्ण हुआ', te: 'సంప్రదింపు పూర్తయింది' },
  thanks: { en: 'Thank you for visiting Sporting Ethos.', hi: 'स्पोर्टिंग एथॉस पधारने के लिए धन्यवाद।', te: 'స్పోర్టింగ్ ఎథోస్‌ను సందర్శించినందుకు ధన్యవాదాలు.' },
  summary: { en: 'Your visit summary', hi: 'आपकी विज़िट का सारांश', te: 'మీ సందర్శన సారాంశం' },
  liveNote: { en: "This page updates live — keep it open and we'll tell you the moment it's your turn.", hi: 'यह पेज लाइव अपडेट होता है — इसे खुला रखें, आपकी बारी आते ही हम बता देंगे।', te: 'ఈ పేజీ లైవ్‌గా అప్‌డేట్ అవుతుంది — తెరిచి ఉంచండి, మీ వంతు వచ్చినప్పుడు తెలియజేస్తాం.' },
  receipt: { en: 'View check-in receipt', hi: 'चेक-इन रसीद देखें', te: 'చెక్-ఇన్ రసీదు చూడండి' },
  assist: { en: 'Assist', hi: 'सहायता', te: 'సహాయం' },
  turnAnnounce: { en: "it's your turn. Please proceed to your consultation room.", hi: 'अब आपकी बारी है, कृपया परामर्श कक्ष में जाएँ।', te: 'ఇప్పుడు మీ వంతు, దయచేసి కన్సల్టేషన్ గదికి వెళ్లండి.' },
}

export function tFor(lang) {
  return (key) => STR[key]?.[lang] ?? STR[key]?.en ?? key
}
export const voiceFor = (lang) => LANGS.find((l) => l.code === lang)?.voice || 'en-US'
