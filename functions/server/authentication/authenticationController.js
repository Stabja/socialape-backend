const { admin, db } = require('../../utils/admin');
//const jwt = require('jsonwebtoken');

const { config, firebase } = require('../../utils/getconfig');
const { validateSignupData, validateLoginData } = require('../../utils/validators');


// User Registration
exports.signup = async (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { errors, valid } = validateSignupData(newUser);

  if(!valid) return res.status(400).json(errors);

  const noImg = 'no-img.png';

  // TODO: validate data (STORE THE NEW USER IN A COLLECTION)
  let userDoc = await db.doc(`/users/${newUser.handle}`).get();
  if(userDoc.exists){
    return res.status(400).json({ handle: 'this user handle is already taken' });
  }

  let signupData = await firebase
    .auth()
    .createUserWithEmailAndPassword(newUser.email, newUser.password);

  if(!signupData){
    return res.status(500).json({ error: 'A problem has occured while registering user.' });
  }  
  let userId = signupData.user.uid;

  let token = signupData.user.getIdToken();
  if(!token){
    return res.status(500).json({ error: 'Error retrieving token.' })
  }

  const userCredentials = {
    handle: newUser.handle,
    email: newUser.email,
    createdAt: new Date().toISOString(),
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
      config.storageBucket
    }/o/${noImg}?alt=media`,
    userId
  };

  const newUserDoc = await db.doc(`/users/${newUser.handle}`).set(userCredentials);
  if(!newUserDoc){
    console.error(err);
    if(err.code === 'auth/email-already-in-use'){
      return res.status(400).json({ email: 'Email is already in use' });
    } else {
      return res.status(500).json({ general: 'Something went wrong, please try again' });
    }
  }
  return res
    .status(201)
    .json({
      userId,
      token
    });
};

exports.login = async (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { errors, valid } = validateLoginData(user);
  if(!valid){
    return res.status(400).json(errors);
  }

  let loginData;
  try {
    loginData = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
  } catch{
    return res
      .status(403)
      .json({ general: 'Wrong credentials, please try again' });
  };

  console.log(loginData);

  let token = await loginData.user.getIdToken();
  if(!token){
    return res.status(500).json({ error: 'Error retrieving token.' })
  }
  return res.json({ token });
};


exports.revokeToken = (req, res) => {
  admin.auth().revokeRefreshTokens(req.params.uid)
    .then(() => {
      return admin.auth().getUser(req.params.uid);
    })
    .then((userRecord) => {
      return new Date(userRecord.tokensValidAfterTime).getTime() / 1000;
    })
    .then((timestamp) => {
      console.log('Tokens revoked at: ', timestamp);
      return res.status(200).json({ message: `Tokens revoked at: ${timestamp}` });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Token Not Revoked' });
    });
};


