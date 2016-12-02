var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  link: String,
  body: String,
  score: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});

PostSchema.methods.upvote = function(callback) {
  this.score += 1;
  this.save(callback);
}

mongoose.model('Post', PostSchema);
