import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TUS CLAVES REALES (Proyecto: armario-de-maria)
const firebaseConfig = {
  apiKey: "AIzaSyD7CkWLhsv7-HbefCV-Su-LwuM08WbEozc",
  authDomain: "armario-de-maria.firebaseapp.com",
  projectId: "armario-de-maria",
  storageBucket: "armario-de-maria.firebasestorage.app",
  messagingSenderId: "577051189783",
  appId: "1:577051189783:web:c8873ce55b8cc85f88b252"
};

// Inicializamos la conexión
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para usarlas en la app
export const db = getFirestore(app);
export const storage = getStorage(app);