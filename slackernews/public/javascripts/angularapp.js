angular.module("slackerNews", ["ui.router"])

.config([
  "$stateProvider",
  "$urlRouterProvider",
  "$state",
  function($stateProvider, $urlRouterProvider, $state) {

    $stateProvider
      .state("home", {
        url: "/home",
        templateUrl: "/home.html",
        controller: "mainCont",
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
        resolve: {
          post: ['$stateParams', 'postsFact', function($stateParams, postsFact) {
            return postsFact.get($stateParams.id);
          }]
        }
      })

      .state("register", {
        url: "/register",
        templateUrl: "/register.html",
        controller: "authCont",
        onEnter: ["$state", "auth", function($state, auth) {
            if(auth.isLoggedIn()) {
              $state.go("home");
          }
        }]
      })

      .state("login", {
        url: "/login",
        templateUrl: "/login.html",
        controller: "authCont",
        onEnter: ["$state", "auth", function($state, auth) {
            if(auth.isLoggedIn()) {
              $state.go("home");
          }
        }]
      })

      $urlRouterProvider.otherwise("home");
  }])

.factory("authFact", ["$http", "$window", function($http, $window) {

  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage["slackernewstoken"] = token;
  }

  auth.getToken = function() {
    return $window.localStorage["slackernewstoken"];
  }

  auth.isLoggedIn = function() {
    var token = auth.getToken();
    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  }

  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.username;
    }
  }

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
      auth.saveToken(data);
    });
  }

  auth.login = function(user) {
    return $http.post('/login', user).success(function(data) {
      auth.saveToken(data);
    });
  }

  auth.logout = function(user) {
    $window.localStorage.removeItem("slackernewstoken");
  }

  return auth;
}])

.factory("postsFact", ["$http", function($http) {

  var obj = {
    posts: []
  };

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
    return $http.post('/post', post).success(function(data) {
      obj.posts.push(data);
    })
  };

  obj.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote').success(function(data) {
      post.score += 1;
    })
  };

  obj.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment).success(function(data) {
      post.score += 1;
    })
  };

  obj.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote').success(function(data) {
      comment.score += 1;
    })
  };

  return obj;
}])

.controller("mainCont", [
  "$scope",
  "postsFact",
  function($scope, postsFact) {

    $scope.posts = postsFact.posts;

    $scope.addPost = function() {
      if($scope.title) {
        postsFact.createPost({
          title: $scope.title,
          link: $scope.link,
          body: $scope.body
        });
        $scope.title = "";
        $scope.link = "";
        $scope.body = "";
      }
      else{
        return;
      }
    }

    $scope.upvote = function(post) {
      postsFact.upvote(post);
    }
  }])

  .controller("postsCont", [
    "$scope",
    "$stateParams",
    "postsFact",
    "post",
    function($scope, $stateParams, postsFact, post) {
      $scope.post = post;

      $scope.addComment = function() {
        if($scope.body) {
          postsFact.addComment(post._id, {
            author: "Bilbo Baggins",
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

      $scope.upvote = function(comment) {
        postsFact.upvoteComment(post, comment);
      }
    }])

  .controller("authCont", [
    "$scope",
    "$state",
    "auth",
    function($scope, $state, auth) {
      $scope.user = {};

      $scope.register = function() {
        auth.register($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('home');
        });
      };

      $scope.login = function() {
        auth.login($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('home');
        });
      };
    }]);
