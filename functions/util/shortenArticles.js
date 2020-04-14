const { 
  default_thumb, 
  default_cover,
  nytstorage_url
} = require('../config/externalUrls');


module.exports = (article) => {
    const defaultThumb = default_thumb;
    const defaultCover = default_cover;
    let newArticle = {};
    newArticle['_id'] = article._id;
    let personList = [];
    article.byline && article.byline.person && article.byline.person.forEach(p => {
      let { firstname, lastname, middlename } = p;
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
    newArticle['document_type'] = article.document_type ? article.document_type : 'article';
    let { content_kicker, main, print_headline } = article.headline;
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
    newArticle['lead_paragraph'] = article.lead_paragraph ? article.lead_paragraph : 'default Paragraph';
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
    newArticle['news_desk'] = article.news_desk ? article.news_desk : null;
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