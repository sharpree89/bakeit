angular.module("bakeit", ["ui.router"])

// <------------------ CLIENT-SIDE ROUTES ------------------>

.config([
  "$stateProvider",
  "$urlRouterProvider",
  function($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state("index", {
        url: "/",
        templateUrl: "/index.html",
        controller: "mainCont",
        // load all the posts before the page has loaded
        resolve: {
          postPromise: ['postsFact', function(postsFact) {
            return postsFact.getAll();
          }]
        }
      })

      .state("posts", {
        url: "/posts/{id}",
        templateUrl: "/posts.html",
        controller: "postsCont",
        // load the specific post before the page has loaded
        resolve: {
          post: ['$stateParams', 'postsFact', function($stateParams, postsFact) {
            return postsFact.get($stateParams.id);
          }]
        }
      })

      .state("login", {
        url: '/login',
        templateUrl: "/login.html",
        controller: "authCont",
        // if user is already logged in, redirect to index
        onEnter: ["$state", "auth", function($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go("index");
          }
        }]
      })

      .state("register", {
        url: '/register',
        templateUrl: "/register.html",
        controller: "authCont",
        // if user is already logged in, redirect to index
        onEnter: ["$state", "auth", function($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go("index");
          }
        }]
      })

      .state("error", {
        url: "/error",
        templateUrl: "/404.html"
      })

      // if user tries an invalid URL, redirect to 404 page

      $urlRouterProvider.otherwise("error");
  }])

// <------------------ SERVICES ------------------>

// <------------------ Auth Factory ------------------>

.factory("auth", ["$http", "$window", function($http, $window) {

  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage["bakeit-token"] = token;
  };

  auth.getToken = function() {
    return $window.localStorage["bakeit-token"];
  };

  // verify that a user is currently logged in (to be used on client-side)
  auth.isLoggedIn = function() {
    var token = auth.getToken();
    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };

  // return the username of the currently logged in user (to be used on client-side)
  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      var username = payload.username;
      return payload.username;
    }
  };

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  auth.login = function(user) {
    return $http.post('/login', user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  auth.logOut = function(user) {
    $window.localStorage.removeItem("bakeit-token");
  };

  return auth;
}])

// <------------------ Posts Factory ------------------>

.factory("postsFact", ["$http", "auth", function($http, auth) {

  var obj = {
    posts: []
  };

  // Post Methods

  obj.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, obj.posts);
    });
  };

  obj.get = function(id) {
    return $http.get('/posts/' + id).then(function(res) {
      return res.data;
    });
  };

  obj.createPost = function(post) {
    return $http.post('/post', post, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      obj.posts.push(data);
    })
  };

  obj.delete = function(post) {
    return $http.delete('/posts/' + post._id + '/delete', post).success(function(data){
    });
  }

  obj.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      post.score += 1;
    })
  };

  // Comment Methods

  obj.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    });
  };

  obj.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      comment.score += 1;
    })
  };

  obj.deleteComment = function(post, comment) {
    console.log('HITTING POSTS FACT LINE 204')
    console.log('Post ID: ' + post._id);
    console.log('Comment ID: ' + comment._id);
    return $http.delete('/posts/' + post._id + '/comments/' + comment._id + '/delete', comment).success(function(data){
      console.log('SUCCESSFULLY WENT TO INDEX.JS');
    })
  };

  return obj;
}])

// <------------------ CONTROLLERS ------------------>

// <------------------ Main Controller ------------------>

.controller("mainCont", [
  "$scope",
  "postsFact",
  "auth",
  "$window",
  function($scope, postsFact, auth, $window) {

    $scope.posts = postsFact.posts;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.sortType = "-score"; // sorting by top score as default
    $scope.searchPosts = ""; // default search/filter item

    $scope.addPost = function() {
      if($scope.title) {
        postsFact.createPost({
          author: auth.currentUser,
          title: $scope.title,
          link: $scope.link,
          body: $scope.body,
          tags: $scope.tags
        });
        // clear forms after submission
        $scope.title = "";
        $scope.link = "";
        $scope.body = "";
        $scope.tags = "";
      }
      else{
        return;
      }
    }

    // To Do: fix upvoting (user can upvote indefinitely if refresh page or log out)
    $scope.upvote = function(post) {
      if(!post.hadUpVoted) {
        postsFact.upvote(post);
        post.hadUpVoted = true;
      }
    }

    $scope.delete = function(post) {
      console.log('LINE 265 MAIN CONTROLLER');
      console.log('Post ID: ' + post._id + 'Post Author: ' + post.author);
      console.log('Current User: ' + auth.currentUser());
      if (auth.currentUser() === post.author) {
        postsFact.delete(post);
        // force refresh to indicate the post has been deleted
        $window.location.reload();
      } else {
        return false;
      }
    }
  }])

  // <------------------ Posts Controller ------------------>

  .controller("postsCont", [
    "$scope",
    "$stateParams",
    "postsFact",
    "post",
    "auth",
    "$window",
    function($scope, $stateParams, postsFact, post, auth, $window) {
      $scope.post = post;
      $scope.isLoggedIn = auth.isLoggedIn;

      $scope.sortType = "-score"; // sorting by top score as default

      $scope.addComment = function() {
        if($scope.body) {
          postsFact.addComment(post._id, {
            author: auth.currentUser,
            body: $scope.body,
          }).success(function(comment) {
            $scope.post.comments.push(comment);
          });
          $scope.body = "";
        }
        else{
          return;
        }
      }

      // To Do: fix upvoting (user can upvote indefinitely if refresh page or log out)
      $scope.upvote = function(comment) {
        if (!comment.hadUpVoted) {
          postsFact.upvoteComment(post, comment);
          comment.hadUpVoted = true;
        }
      }

      // To Do: Figure out how to update post.comments.length after a comment has been deleted
      // number does not update on homepage
      $scope.delete = function(comment) {
        $scope.deleteError = false;
        console.log('LINE 329 POST CONTROLLER');
        console.log('Comment ID: ' + comment._id + 'Comment Author: ' + comment.author);
        console.log('Current User: ' + auth.currentUser());
        if (auth.currentUser() === comment.author) {
          postsFact.deleteComment(post, comment);
          // force refresh to indicate the post has been deleted
          $window.location.reload();
        } else {
          $scope.deleteError = true;
          return false;
        }
      }
    }])

// <------------------ Auth Controller ------------------>

  .controller("authCont", [
    "$scope",
    "auth",
    "$state",
    function($scope, auth, $state) {
      $scope.user = {};

      $scope.register = function() {
        auth.register($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('index');
        });
      };

      $scope.login = function() {
        auth.login($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('index');
        });
      };
    }])

// <------------------ NavBar Controller ------------------>

  .controller("navCont", [
    "$scope",
    "auth",
    function($scope, auth) {
      $scope.isLoggedIn = auth.isLoggedIn;
      $scope.currentUser = auth.currentUser;
      $scope.logOut = auth.logOut;
    }])

// <------------------ CUSTOM FILTERS ------------------>

// splits the string 'post.tags' for display on Client-Side
  .filter("commaBreak",
    function() {
      return function(value) {
        if (!value) {
          return;
        }
        return value.split(',');
      }
    })
