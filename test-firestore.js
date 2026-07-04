import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);
getDoc(doc(db, "appData", "main")).then(() => { console.log("Success!"); process.exit(0); })
.catch(e => { console.error("Error:", e.message); process.exit(1); });
