const { db } = require('./admin');


const UserModel = db.collection('users');
const ScreamModel = db.collection('screams');
const LikeModel = db.collection('likes');
const CommentModel = db.collection('comments');
const FollowerModel = db.collection('followers');
const ConnectionModel = db.collection('connections');
const NotificationModel = db.collection('notifications');
const TagModel = db.collection('tags');

const ArtistModel = db.collection('artists')
const TrackModel = db.collection('tracks');

const NYTArticleModel = db.collection('nytarticles');
const PersonsModel = db.collection('persons');
const NewsdeskModel = db.collection('news_desk');
const SubjectModel = db.collection('keyword_subject');
const PersonModel = db.collection('keyword_persons');
const OrganizationModel = db.collection('keyword_organizations');
const GlocationModel = db.collection('keyword_glocations');



module.exports = {
  UserModel,
  ScreamModel,
  LikeModel,
  CommentModel,
  FollowerModel,
  ConnectionModel,
  NotificationModel,
  TagModel,
  ArtistModel,
  TrackModel,
  NYTArticleModel,
  PersonsModel,
  NewsdeskModel,
  SubjectModel,
  PersonModel,
  OrganizationModel,
  GlocationModel
}