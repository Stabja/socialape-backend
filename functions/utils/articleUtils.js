const { 
  default_thumb, 
  default_cover,
  nytstorage_url
} = require('../config/externalUrls');


exports.addDataAsync = (shortenedList) => {
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


exports.shortenArticle = (article) => {
  const defaultThumb = default_thumb;
  const defaultCover = default_cover;
  let newArticle = {};
  newArticle['_id'] = article._id
  //fillMissingValues();
  let personList = [];
  if(article.byline) {
    article.byline.person && article.byline.person.forEach(p => {
      let { firstname, lastname, middlename } = p;
      firstname = firstname ? firstname : 'Gavin';
      lastname = lastname ? lastname : 'Belson';
      middlename = middlename ? middlename : null;
      let np = { firstname, lastname, middlename };
      personList.push(np);
    });
    (personList.length === 0) && personList.push({
      firstname: 'NyTimes', 
      lastname: 'Article', 
      middlename: null
    });
    newArticle['byline'] = {};
    newArticle['byline'].person = personList;
    newArticle['byline'].organization = article.byline.organization ? article.byline.organization : 'NewYorkTimes';
    newArticle['byline'].original = article.byline.original ? 
      (article.byline.original.split('By ')[1] ? 
        article.byline.original.split('By ')[1] : 
        'NyTimes Article') :
        'NyTimes Article';
  } else {
    personList.push({
      firstname: 'NyTimes', 
      lastname: 'Article', 
      middlename: null
    });
    newArticle['byline'] = {};
    newArticle['byline'].person = personList;
    newArticle['byline'].organization ='NewYorkTimes';
    newArticle['byline'].original = 'NyTimes Article';
  }
  newArticle['document_type'] = 
    article.document_type
      ? article.document_type
      : 'article';
  let { content_kicker, main, print_headline } = article.headline;
  content_kicker = content_kicker ? content_kicker : 'Default ContentKicker';
  main = main ? main : 'Default Main';
  print_headline = print_headline ? print_headline : 'Default Headline'; 
  newArticle['headline'] = { content_kicker, main, print_headline };
  let keywordList = [];
  article.keywords && article.keywords.forEach(word => {
    let { name, value } = word;
    let newWord = { name, value };
    keywordList.push(newWord);
  });
  (keywordList.length === 0) && keywordList.push({
    name: 'subject',
    value: 'Default Article'
  });
  newArticle['keywords'] = keywordList;
  newArticle['lead_paragraph'] = 
    article.lead_paragraph
    ? article.lead_paragraph
    : 'default Paragraph';
  let mediaList = [];
  article.multimedia && article.multimedia.forEach(media => {
    let newUrl = nytstorage_url + media.url;
    mediaList.push(newUrl);
  });
  if(mediaList.length === 0){
    mediaList.push(defaultCover);
    mediaList.push(defaultThumb);
  }
  newArticle['multimedia'] = mediaList;
  newArticle['news_desk'] = article.news_desk ? article.news_desk : "Default";
  //newArticle['print_page'] = article.print_page;
  newArticle['pub_date'] = article.pub_date ? article.pub_date : null;
  newArticle['score'] = article.score ? article.score : null;
  newArticle['section_name'] = article.section_name ? article.section_name : null;
  newArticle['snippet'] = article.snippet ? article.snippet : null;
  newArticle['source'] = article.source ? article.source : null;
  newArticle['type_of_material'] = article.type_of_material ? article.type_of_material : null;
  newArticle['uri'] = article.uri ? article.uri : null;
  newArticle['web_url'] = article.web_url ? article.web_url : null;
  newArticle['word_count'] = article.word_count ? article.word_count : null;
  return newArticle;
};


const fillMissingValues = () => {
  article._id.substr(6, 5) === 'artic'
    ? newArticle['_id'] = article._id.split('nyt://article/')[1]
    : article._id.substr(6, 5) === 'inter'
    ? newArticle['_id'] = article._id.split('nyt://interactive/')[1]
    : article._id.substr(6, 5) === 'slide'
    ? newArticle['_id'] = article._id.split('nyt://slideshow/')[1]
    : article._id.substr(6, 5) === 'audio'
    ? newArticle['_id'] = article._id.split('nyt://audio/')[1]
    : article._id.substr(6, 5) === 'video'
    ? newArticle['_id'] = article._id.split('nyt://video/')[1]
    : newArticle['_id'] = article._id
  var pattern = "-";
  let re = new RegExp(pattern, "g");  
  newArticle['_id'] = newArticle['_id'].replace(re, '');
};


exports.lowercaseArticle = (article) => {
  if(!article.byline){
    console.log('byline doesnt exist' );
    return;
  }
  if(article.byline.original){
    article.byline.original = article.byline.original.toLowerCase();
    let originalStr = article.byline.original;
    let replacedStr = originalStr.replace(/ and /g, ', ');
    let personList = replacedStr.split(', ');
    //console.log('ReplacedStr', replacedStr);
    //console.log('PersonList', personList);
    let newPersonList = [];
    personList.map(person => {
      let fullName = person.split(' ');
      let personObj = {};
      if(fullName.length >= 3) {
        personObj.firstname = fullName[0];
        personObj.middlename = fullName[1];
        personObj.lastname = fullName[2];
      } else if (fullName.length === 2) {
        personObj.firstname = fullName[0];
        personObj.middlename = null;
        personObj.lastname = fullName[1];
      } else if (fullName.length === 1) {
        personObj.firstname = fullName[0];
        personObj.middlename = null;
        personObj.lastname = null;
      } else {
        personObj.firstname = null;
        personObj.middlename = null;
        personObj.lastname = null;
      }
      newPersonList.push(personObj);
    });
    article.byline.person = newPersonList;
    console.log('byline.person:', article.byline.person);
  } else {
    if(article.byline.person.length > 0) {
      let originalName = '';
      if(article.byline.person.length === 1){
        article.byline.person.map(p => {
          p.firstname = p.firstname.toLowerCase();
          p.middlename ? p.middlename = p.middlename.toLowerCase() : null;
          p.lastname = p.lastname.toLowerCase();
          p.middlename
          ? originalName = p.firstname + ' ' + p.middlename + ' ' + p.lastname
          : originalName = p.firstname + ' ' + p.lastname
        });
      } else {
        article.byline.person.map((p, i, arr) => {
          p.firstname = p.firstname.toLowerCase();
          p.middlename ? p.middlename = p.middlename.toLowerCase() : null;
          p.lastname = p.lastname.toLowerCase();
          let tempName = null;
          p.middlename
          ? tempName = p.firstname + ' ' + p.middlename + ' ' + p.lastname
          : tempName = p.firstname + ' ' + p.lastname
          i < arr.length-1 ? originalName += tempName + ' and ' : originalName += tempName;
        });
      }
      article.byline.original = originalName;
      console.log('byline.original:', originalName);
    } else {
      console.log('byline.original doesnt exist');
      return;
    }
  }
  return article;
};

