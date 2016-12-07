var express = require('express');
var jwt = require('express-jwt');
var router = express.Router();
var auth = jwt({ secret: 'SECRET', userProperty: 'payload' });
var passport = require('passport');

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

// <------------------ GET Routes ------------------>

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts) {
    if(err) {
      next(err);
    }
    res.json(posts);
  })
});

router.get('/posts/:post', function(req, res) {
  req.post.populate('comments', function(err, post) {
    res.json(post);
  })
});

// <------------------ POST Routes (Register, Login, Post, Comment) ------------------>

router.post('/register', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please do not leave any fields blank.' });
  }
  if (req.body.username.length < 6 || req.body.username.length > 18) {
    return res.status(400).json({ message: 'Username must have between 6 and 18 characters.' });
  }
  if (req.body.password.length < 8) {
    return res.status(400).json({ message: 'Password must have at least 8 characters.' });
  }

  var user = new User();

  user.username = req.body.username;
  user.setPassword(req.body.password);
  user.save(function(err) {
    if (err){
      return next(err);
    }
    return res.json({ token: user.generateJWT() });
  })
});

router.post('/login', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please do not leave any fields blank.' });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (user) {
      return res.json({ token: user.generateJWT() });
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});

router.post('/post', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;

  post.save(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

router.post('/posts/:post/comments', auth, function(req, res, next) {
  //creating a new mongoose object == to the request body
  var comment = new Comment(req.body);
  //setting the comment's associated post == to that specific post
  comment.post = req.post;
  comment.author = req.payload.username;
  //save the new comment into the db
  comment.save(function(err, comment) {
    if (err) {
      return next(err);
    }
    //push the new comment into the post's array of comments
    req.post.comments.push(comment);
    //save changes to the post
    req.post.save(function(err, post) {
      if (err) {
        return next(err);
      }
      res.json(comment);
    })
  })
});

// <------------------ PUT Routes (Voting) ------------------>

router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function(err, post) {
    if (err) {
      return next(err);
    }
    if (!post) {
      return next(new Error("Sorry, we couldn't find that post!"));
    }
    req.post = post;
    return next();
  })
});

router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function(err, comment) {
    if (err) {
      return next(err);
    }
    if (!comment) {
      return next(new Error("Sorry, we couldn't find that comment!"));
    }
    req.comment = comment;
    return next();
  })
});

router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

router.put('/posts/:post/downvote', auth, function(req, res, next) {
  req.post.downvote(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  })
});

router.put('/posts/:post/comments/:comment/downvote', auth, function(req, res, next) {
  req.comment.downvote(function(err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  })
});

// <------------------ DELETE Routes (Posts, Comments) ------------------>

router.delete('/posts/:post/delete', function(req, res, next) {
  console.log('HITTING DELETE POST ROUTE');
  req.post.remove(function (err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

router.delete('/posts/:post/comments/:comment/delete', function(req, res, next) {
  console.log('HITTING DELETE COMMENT ROUTE');
  console.log(req.comment);
  req.comment.remove(function (err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  })

});

// curl http://localhost:3000/posts/5843c16f3eb5398d4140bdd6/comments/5844eed731d7fd07c3d5ca55/delete



module.exports = router;
