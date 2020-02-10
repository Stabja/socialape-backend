let db = {
  users: [
    {
      userId: 'dh23ggj5h32g543j5gf43',
      email: 'user@email.com',
      handle: 'user',
      createdAt: '2019-03-15T10:59:52.798Z',
      imageUrl: 'image/sajhvbcdshjvbdjs/sdhjvbdsjhvcs',
      bio: 'Hello, my name is user, nice to meet you',
      website: 'https://user.com',
      location: 'London, UK'
    }
  ],
  screams: [
    {
      userHandle: 'user',
      body: 'This is the scream body',
      createdAt: '2019-11-21T01:31:36.392Z',
      likeCount: 5,
      commentCount: 3
    }
  ],
  comments: [
    {
      userHandle: 'user',
      screamId: 'jdbchjsbchdjscjksbckjs',
      body: 'nice one mate!',
      createdAt: '71qwu87216212198219'
    }
  ],
  notifications: [
    {
      recipient: 'user',
      sender: 'john',
      read: 'true | false',
      screamId: 'shvcbadsbvbdsakvbda',
      type: 'like | comment',
      createdAt: '2019-03-15T10:59:52.798Z'
    }
  ]
};

const userDetails = {
  // Redux data
  credentials: {
    userId: 'dh23ggj5h32g543j5gf43',
    email: 'user@email.com',
    handle: 'user',
    createdAt: '2019-03-15T10:59:52.798Z',
    imageUrl: 'image/sajhvbcdshjvbdjs/sdhjvbdsjhvcs',
    bio: 'Hello, my name is user, nice to meet you',
    website: 'https://user.com',
    location: 'London, UK'
  },
  likes: [
    {
      userHandle: 'user',
      screamId: 'shdbcdjscbvjdsvc'
    },
    {
      userHandle: 'user',
      screamId: 'dhsgcvdvcjhdsvcj'
    }
  ]
};
