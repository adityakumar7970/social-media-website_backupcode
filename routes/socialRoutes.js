const express = require('express');
const auth = require('../middleware/auth');
const socialController = require('../controllers/socialController');

const router = express.Router();

// SEARCH
router.get('/search', auth, socialController.searchUsers);

// STORIES
router.get('/stories', auth, socialController.getStories);
router.post('/stories', auth, socialController.createStory);
router.delete('/stories/:storyId', auth, socialController.deleteStory);

// POSTS
router.get('/posts', auth, socialController.getPosts);
router.get('/posts/user/:userId', auth, socialController.getUserPosts);
router.get('/posts/reels', auth, socialController.getReels);
router.post('/posts', auth, socialController.createPost);
router.delete('/posts/:postId', auth, socialController.deletePost);

// COMMENTS (ONLY ONE FORMAT)
router.get('/comments/:postId', auth, socialController.getCommentsForPost);
router.post('/comments/:postId', auth, socialController.addComment);
router.delete('/comments/:commentId', auth, socialController.deleteComment);

// LIKES
router.post('/likes/:postId', auth, socialController.toggleLike);
router.post('/posts/:postId/like', auth, socialController.toggleLike); // backward-compatible alias for existing frontend calls

// FOLLOW
router.post('/follow/:userId', auth, socialController.toggleFollow);

// PROFILE
router.get('/profile/:username', auth, socialController.getProfile);
router.get('/users/:userId', auth, socialController.getProfileById);

module.exports = router;