import pkg from "firebase-admin";


const serviceAccountRaw = {
  
};
const firebaseConfig = {
  
  };
  
pkg.initializeApp({
  credential: pkg.credential.cert(serviceAccountRaw),
  storageBucket: "bengkel-fdf57.appspot.com",

});





const bucket = pkg.storage().bucket();


export { pkg as firebase, bucket , firebaseConfig  };