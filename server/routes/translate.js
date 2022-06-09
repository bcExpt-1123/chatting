import express from 'express';
import { createRequire } from "module";
import { v2 } from '@google-cloud/translate';
const require = createRequire(import.meta.url); // construct the require method
const googleCloudTranslation = require("../config/myuserprojectjsonkey.json")
const { Translate } = v2;

const translate = new Translate({
    projectId: 'next-office-work',
    credentials: googleCloudTranslation
});

// controllers

const router = express.Router();


router.post("/", async (req, res) => {
    try {
        console.log(req.body);
        const { text, target } = req.body;
        const result = await translateText(text, target)
        return res.status(200).json({ success: true, result })
    } catch (error) {
        return res.status(500).json({ success: false, error: error })
    }
});

async function translateText(text, target) {
    // Translates the text into the target language. "text" can be a string for
    // translating a single piece of text, or an array of strings for translating
    // multiple texts.
    let [translations] = await translate.translate(text, target);
    translations = Array.isArray(translations) ? translations : [translations];
    translations.forEach((translation, i) => {
        console.log(`${text[i]} => (${target}) ${translation}`);
    });
    console.log(translations)
    return translations;

}

export default router;