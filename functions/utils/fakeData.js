const faker = require('faker');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();


const fakeIt = () => {
  return db.collection('algoliatest').add({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    avatar: faker.internet.avatar(),
    bio: faker.hacker.phrase(),
    color: faker.commerce.color()
  });
};


Array(20).fill(0).forEach(fakeIt);