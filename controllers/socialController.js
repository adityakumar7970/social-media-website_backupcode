const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');

function inferMediaType(mediaUrl) {
  if (typeof mediaUrl !== 'string') {
    return 'image';
  }
  if (mediaUrl.startsWith('data:video') || mediaUrl.includes('video')) {
    return 'video';
  }
  return 'image';
}

async function getStories(req, res) {
  try {
    const followRecords = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const followedIds = followRecords.map((record) => record.followingId);
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      userId: { $in: [req.user.userId, ...followedIds] },
      createdAt: { $gte: windowStart },
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'username avatar');

    const grouped = stories.reduce((acc, story) => {
      const authorId = story.userId._id.toString();
      if (!acc[authorId]) {
        acc[authorId] = {
          author: {
            userId: story.userId._id.toString(),
            username: story.userId.username,
            avatar: story.userId.avatar || '',
          },
          isMine: story.userId._id.toString() === req.user.userId.toString(),
          stories: [],
        };
      }

      acc[authorId].stories.push({
        id: story._id.toString(),
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt,
      });

      return acc;
    }, {});

    const storyGroups = Object.values(grouped)
      .map((group) => {
        group.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const firstStory = group.stories[0];
        return {
          author: group.author,
          isMine: group.isMine,
          stories: group.stories,
          thumbnailUrl: firstStory.mediaUrl,
          thumbnailType: firstStory.mediaType,
          thumbnailCaption: firstStory.caption,
          storyCount: group.stories.length,
        };
      })
      .sort((a, b) => {
        if (a.isMine !== b.isMine) {
          return a.isMine ? -1 : 1;
        }
        return new Date(b.stories[b.stories.length - 1].createdAt) - new Date(a.stories[a.stories.length - 1].createdAt);
      });

    return res.json({ success: true, storyGroups });
  } catch (error) {
    console.error('Stories fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch stories.' });
  }
}

async function createStory(req, res) {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: 'Story media is required.' });
    }

    const storedMediaType = mediaType || inferMediaType(mediaUrl);
    const story = new Story({
      userId: req.user.userId,
      mediaUrl,
      mediaType: storedMediaType,
      caption: caption ? caption.trim() : '',
    });

    await story.save();
    return res.status(201).json({ success: true, story });
  } catch (error) {
    console.error('Story creation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create story.' });
  }
}

async function deleteStory(req, res) {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }
    if (story.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own story.' });
    }

    await story.deleteOne();
    return res.json({ success: true, message: 'Story deleted.' });
  } catch (error) {
    console.error('Story delete error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete story.' });
  }
}

async function buildPostPayload(posts, currentUserId, followedIds = []) {
  const postIds = posts.map((post) => post._id);
  const likes = await Like.find({ postId: { $in: postIds } });
  const comments = await Comment.find({ postId: { $in: postIds } });

  const likeMap = likes.reduce((acc, like) => {
    const key = like.postId.toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const commentMap = comments.reduce((acc, comment) => {
    const key = comment.postId.toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const likedSet = new Set(
    likes
      .filter((like) => like.userId.toString() === currentUserId.toString())
      .map((like) => like.postId.toString())
  );

  const followingSet = new Set(followedIds.map((id) => id.toString()));

  return posts.map((post) => ({
    id: post._id.toString(),
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    caption: post.caption,
    createdAt: post.createdAt,
    author: {
      userId: post.userId._id.toString(),
      username: post.userId.username,
      avatar: post.userId.avatar || '',
    },
    likes: likeMap[post._id.toString()] || 0,
    comments: commentMap[post._id.toString()] || 0,
    liked: likedSet.has(post._id.toString()),
    isMine: post.userId._id.toString() === currentUserId.toString(),
    isFollowingAuthor: followingSet.has(post.userId._id.toString()),
  }));
}

async function getPosts(req, res) {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatar');

    const followRecords = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const followedIds = followRecords.map((record) => record.followingId);

    const payload = await buildPostPayload(posts, req.user.userId, followedIds);
    return res.json({ success: true, posts: payload });
  } catch (error) {
    console.error('Posts fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch posts.' });
  }
}

async function getFeedPosts(req, res) {
  try {
    const followRecords = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const followedIds = followRecords.map((record) => record.followingId);
    const authorIds = [req.user.userId, ...followedIds];

    const posts = await Post.find({ userId: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatar');

    const payload = await buildPostPayload(posts, req.user.userId, followedIds);
    return res.json({ success: true, posts: payload });
  } catch (error) {
    console.error('Feed fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch feed.' });
  }
}

async function getUserPosts(req, res) {
  try {
    const requestedUserId = req.params.userId === 'me' ? req.user.userId : req.params.userId;
    if (!requestedUserId || !mongoose.Types.ObjectId.isValid(requestedUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const posts = await Post.find({ userId: requestedUserId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatar');

    const followRecords = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const followedIds = followRecords.map((record) => record.followingId);
    const payload = await buildPostPayload(posts, req.user.userId, followedIds);

    return res.json({ success: true, posts: payload });
  } catch (error) {
    console.error('User posts fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch user posts.' });
  }
}

async function getReels(req, res) {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatar');

    const followRecords = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const followedIds = followRecords.map((record) => record.followingId);
    const payload = await buildPostPayload(posts, req.user.userId, followedIds);

    return res.json({ success: true, posts: payload });
  } catch (error) {
    console.error('Reels fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch reels.' });
  }
}

async function createPost(req, res) {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: 'Post media is required.' });
    }

    const storedMediaType = mediaType || inferMediaType(mediaUrl);
    const post = new Post({
      userId: req.user.userId,
      mediaUrl,
      mediaType: storedMediaType,
      caption: caption ? caption.trim() : '',
    });

    await post.save();
    return res.status(201).json({ success: true, post });
  } catch (error) {
    console.error('Post creation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create post.' });
  }
}

async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (post.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own post.' });
    }

    await post.deleteOne();
    await Like.deleteMany({ postId: post._id });
    await Comment.deleteMany({ postId: post._id });
    return res.json({ success: true, message: 'Post deleted.' });
  } catch (error) {
    console.error('Post delete error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete post.' });
  }
}

async function getCommentsForPost(req, res) {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).populate('userId', 'username avatar');
    const payload = comments.map((comment) => ({
      id: comment._id.toString(),
      text: comment.text,
      createdAt: comment.createdAt,
      author: {
        userId: comment.userId._id.toString(),
        username: comment.userId.username,
        avatar: comment.userId.avatar || '',
      },
      isMine: comment.userId._id.toString() === req.user.userId.toString(),
    }));
    return res.json({ success: true, comments: payload });
  } catch (error) {
    console.error('Comment fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch comments.' });
  }
}

async function addComment(req, res) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const commentDoc = await Comment.create({ postId: req.params.postId, userId: req.user.userId, text: text.trim() });
    const commentCount = await Comment.countDocuments({ postId: req.params.postId });

    const comment = {
      id: commentDoc._id.toString(),
      text: commentDoc.text,
      createdAt: commentDoc.createdAt,
      author: {
        userId: req.user.userId.toString(),
        username: req.user.username,
        avatar: '',
      },
      isMine: true,
    };

    return res.status(201).json({ success: true, comment, comments: commentCount });
  } catch (error) {
    console.error('Comment creation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create comment.' });
  }
}

async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }
    if (comment.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comment.' });
    }

    await comment.deleteOne();
    return res.json({ success: true, message: 'Comment deleted.' });
  } catch (error) {
    console.error('Comment delete error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete comment.' });
  }
}

async function toggleLike(req, res) {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const existingLike = await Like.findOne({ postId, userId: req.user.userId });
    if (existingLike) {
      await existingLike.deleteOne();
      const currentCount = await Like.countDocuments({ postId });
      return res.json({ success: true, liked: false, likes: currentCount });
    }

    await Like.create({ postId, userId: req.user.userId });
    const currentCount = await Like.countDocuments({ postId });
    return res.json({ success: true, liked: true, likes: currentCount });
  } catch (error) {
    console.error('Like toggle error:', error);
    return res.status(500).json({ success: false, message: 'Unable to like post.' });
  }
}

async function toggleFollow(req, res) {
  try {
    const targetUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }
    if (targetUserId.toString() === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const existingFollow = await Follow.findOne({ followerId: req.user.userId, followingId: targetUserId });
    if (existingFollow) {
      await existingFollow.deleteOne();
      return res.json({ success: true, following: false });
    }

    await Follow.create({ followerId: req.user.userId, followingId: targetUserId });
    return res.json({ success: true, following: true });
  } catch (error) {
    console.error('Follow toggle error:', error);
    return res.status(500).json({ success: false, message: 'Unable to toggle follow.' });
  }
}

async function searchUsers(req, res) {
  try {
    const query = (req.query.query || '').trim();
    if (!query || query.length < 1) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    }).select('_id username avatar firstName lastName').limit(10);

    const payload = users.map(user => ({
      userId: user._id.toString(),
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar || '',
    }));

    return res.json({ success: true, users: payload });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ success: false, message: 'Unable to search users.' });
  }
}

async function getProfile(req, res) {
  try {
    const username = (req.params.username || '').trim().toLowerCase();
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });
    const isFollowing = user._id.toString() !== req.user.userId.toString() && Boolean(
      await Follow.exists({ followerId: req.user.userId, followingId: user._id })
    );

    return res.json({
      success: true,
      profile: {
        userId: user._id.toString(),
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar || '',
        bio: user.bio || '',
        followers: followersCount,
        following: followingCount,
        isMine: user._id.toString() === req.user.userId.toString(),
        isFollowing,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load profile.' });
  }
}

async function getProfileById(req, res) {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });
    const isFollowing = user._id.toString() !== req.user.userId.toString() && Boolean(
      await Follow.exists({ followerId: req.user.userId, followingId: user._id })
    );

    return res.json({
      success: true,
      user: {
        userId: user._id.toString(),
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar || '',
        bio: user.bio || '',
        followers: followersCount,
        following: followingCount,
        isMine: user._id.toString() === req.user.userId.toString(),
        isFollowing,
      },
    });
  } catch (error) {
    console.error('Profile by ID fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load user profile.' });
  }
}

module.exports = {
  getStories,
  createStory,
  deleteStory,
  getPosts,
  getFeedPosts,
  getUserPosts,
  getReels,
  createPost,
  deletePost,
  getCommentsForPost,
  addComment,
  deleteComment,
  toggleLike,
  toggleFollow,
  searchUsers,
  getProfile,
  getProfileById,
};
