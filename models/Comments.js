var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema({
  author: String,
  body: { type: String, required: true },
  score: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
});

CommentSchema.methods.upvote = function(callback) {
  this.score += 1;
  this.save(callback);
}

CommentSchema.methods.downvote = function(callback) {
  this.score -= 1;
  this.save(callback);
}

mongoose.model('Comment', CommentSchema);
