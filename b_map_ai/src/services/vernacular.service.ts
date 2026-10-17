export type IndianLanguage =
  | "hi" // Hindi
  | "bn" // Bengali
  | "ta" // Tamil
  | "te" // Telugu
  | "kn" // Kannada
  | "mr" // Marathi
  | "gu" // Gujarati
  | "ml" // Malayalam
  | "pa" // Punjabi
  | "as" // Assamese
  | "or" // Odia
  | "en_in"; // Indian English

export interface VernacularVoicePrompt {
  language: IndianLanguage;
  languageName: string;
  nativeScript: string;
  phoneticScript: string;
  landmarkReference?: string;
}

export class VernacularService {
  private static prompts: Record<IndianLanguage, { name: string; template: (dist: string, turn: string, landmark?: string) => { native: string; phonetic: string } }> = {
    hi: {
      name: "Hindi (हिंदी)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} ke baad ${dist} mein ${turn} lein.`
          : `${dist} mein ${turn} lein.`,
        phonetic: landmark
          ? `${landmark} ke baad ${dist} mein ${turn} lein.`
          : `${dist} mein ${turn} lein.`,
      }),
    },
    bn: {
      name: "Bengali (বাংলা)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark}-এর পরে ${dist} মধ্যে ${turn} নিন।`
          : `${dist}-এর মধ্যে ${turn} নিন।`,
        phonetic: `${landmark ? landmark + "-er pore " : ""}${dist}-er moddhe ${turn} nin.`,
      }),
    },
    ta: {
      name: "Tamil (தமிழ்)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark}க்கு பிறகு ${dist}ல் ${turn} எடுக்கவும்.`
          : `${dist}ல் ${turn} எடுக்கவும்.`,
        phonetic: `${landmark ? landmark + "-ku piragu " : ""}${dist}-il ${turn} edukkavum.`,
      }),
    },
    te: {
      name: "Telugu (తెలుగు)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} తర్వాత ${dist}లో ${turn} తీసుకోండి.`
          : `${dist}లో ${turn} తీసుకోండి.`,
        phonetic: `${landmark ? landmark + " taruvatha " : ""}${dist}-lo ${turn} teesukondi.`,
      }),
    },
    kn: {
      name: "Kannada (ಕನ್ನಡ)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} ನಂತರ ${dist}ನಲ್ಲಿ ${turn} ತೆಗೆದುಕೊಳ್ಳಿ.`
          : `${dist}ನಲ್ಲಿ ${turn} ತೆಗೆದುಕೊಳ್ಳಿ.`,
        phonetic: `${landmark ? landmark + " nanthara " : ""}${dist}-nalli ${turn} thegedukolli.`,
      }),
    },
    mr: {
      name: "Marathi (मराठी)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} नंतर ${dist} मध्ये ${turn} वळा.`
          : `${dist} मध्ये ${turn} वळा.`,
        phonetic: `${landmark ? landmark + " nantar " : ""}${dist} madhye ${turn} vala.`,
      }),
    },
    gu: {
      name: "Gujarati (ગુજરાતી)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} પછી ${dist} માં ${turn} લો.`
          : `${dist} માં ${turn} લો.`,
        phonetic: `${landmark ? landmark + " pachhi " : ""}${dist} ma ${turn} lo.`,
      }),
    },
    ml: {
      name: "Malayalam (മലയാളം)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} കഴിഞ്ഞാൽ ${dist}ൽ ${turn} തിരിയുക.`
          : `${dist}ൽ ${turn} തിരിയുക.`,
        phonetic: `${landmark ? landmark + " kazhinjal " : ""}${dist}-il ${turn} thiriyuka.`,
      }),
    },
    pa: {
      name: "Punjabi (ਪੰਜਾਬੀ)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} ਤੋਂ ਬਾਅਦ ${dist} ਵਿੱਚ ${turn} ਮੁੜੋ।`
          : `${dist} ਵਿੱਚ ${turn} ਮੁੜੋ।`,
        phonetic: `${landmark ? landmark + " ton baad " : ""}${dist} vich ${turn} muro.`,
      }),
    },
    as: {
      name: "Assamese (অসমীয়া)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark}ৰ পিছত ${dist}ত ${turn} লওক।`
          : `${dist}ত ${turn} লওক।`,
        phonetic: `${landmark ? landmark + "-r pisat " : ""}${dist}-t ${turn} laok.`,
      }),
    },
    or: {
      name: "Odia (ଓଡ଼ିଆ)",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `${landmark} ପରେ ${dist}ରେ ${turn} ବୁଲନ୍ତୁ।`
          : `${dist}ରେ ${turn} ବୁଲନ୍ତୁ।`,
        phonetic: `${landmark ? landmark + " pare " : ""}${dist}-re ${turn} bulantu.`,
      }),
    },
    en_in: {
      name: "Indian English",
      template: (dist, turn, landmark) => ({
        native: landmark
          ? `In ${dist}, take a ${turn} right after ${landmark}.`
          : `In ${dist}, take a ${turn}.`,
        phonetic: landmark
          ? `In ${dist}, take a ${turn} right after ${landmark}.`
          : `In ${dist}, take a ${turn}.`,
      }),
    },
  };

  /**
   * Synthesize localized voice instruction in one of 12 Indian languages
   */
  public static getVoiceGuidance(params: {
    language: IndianLanguage;
    distanceText: string;
    turnDirection: "left" | "right" | "u-turn" | "slight right" | "slight left";
    landmark?: string;
  }): VernacularVoicePrompt {
    const langConfig = this.prompts[params.language] || this.prompts["en_in"];
    const rendered = langConfig.template(params.distanceText, params.turnDirection, params.landmark);

    return {
      language: params.language,
      languageName: langConfig.name,
      nativeScript: rendered.native,
      phoneticScript: rendered.phonetic,
      landmarkReference: params.landmark,
    };
  }

  public static getSupportedLanguages(): Array<{ code: IndianLanguage; name: string }> {
    return Object.entries(this.prompts).map(([code, val]) => ({
      code: code as IndianLanguage,
      name: val.name,
    }));
  }
}
