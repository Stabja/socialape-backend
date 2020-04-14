module.exports = (shortenedList) => {
  let articleCount = 0
  return new Promise((resolve, reject) => {
    shortenedList.forEach((article, index, array) => {  
      db.collection('nytarticles')
        .doc(article._id)
        .set(article)
        .then(() => {
          articleCount++;
          console.log(`${article._id} Pushed`);
          if(index === array.length-1){
            resolve(articleCount);
          }
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({ error: err.code });
        });
    });
  });
};