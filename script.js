// script.js
const BACKEND_HOST = 'http://localhost:5000';
const AUTH_API_BASE = `${BACKEND_HOST}/api/auth`;
const SOCIAL_API_BASE = `${BACKEND_HOST}/api/social`;
const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEY = 'SocialixToken';
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showLoginButton = document.getElementById('showLoginButton');
const showSignupButton = document.getElementById('showSignupButton');
const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return token;
  }
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacyToken;
  }
  return null;
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function clearUserStorage() {
  localStorage.removeItem('SocialixProfile');
  localStorage.removeItem('posts');
  localStorage.removeItem('stories');
  localStorage.removeItem('reelsPosts');
}

function clearSessionData() {
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('fullName');
}

function resetUserSession() {
  clearSessionData();
  removeToken();
  clearUserStorage();
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const requestUrl = path.startsWith('/api/') ? `${BACKEND_HOST}${path}` : path;
  const fetchOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(requestUrl, fetchOptions);
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch (error) {
    data = { message: body };
  }

  return { response, data };
}

async function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

async function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

async function showLoginPanel() {
  if (loginForm) loginForm.classList.add('active');
  if (signupForm) signupForm.classList.remove('active');
  if (showLoginButton) showLoginButton.classList.add('active');
  if (showSignupButton) showSignupButton.classList.remove('active');
}

function showSignupPanel() {
  if (loginForm) loginForm.classList.remove('active');
  if (signupForm) signupForm.classList.add('active');
  if (showLoginButton) showLoginButton.classList.remove('active');
  if (showSignupButton) showSignupButton.classList.add('active');
}

if (showLoginButton) {
  showLoginButton.addEventListener('click', showLoginPanel);
}

if (showSignupButton) {
  showSignupButton.addEventListener('click', showSignupPanel);
}

if (switchToSignup) {
  switchToSignup.addEventListener('click', showSignupPanel);
}

if (switchToLogin) {
  switchToLogin.addEventListener('click', showLoginPanel);
}

if (loginForm) {
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const loginId = document.getElementById('loginId').value.trim();
    const loginPassword = document.getElementById('loginPassword').value.trim();

    if (!loginId || !loginPassword) {
      alert('Please enter your email/mobile and password.');
      return;
    }

    try {
      const { response, data: result } = await apiPost(`${AUTH_API_BASE}/login`, {
        loginId,
        password: loginPassword,
      });

      if (!response.ok) {
        alert(result.message || 'Login failed.');
        return;
      }

      resetUserSession();
      console.log('Login successful, token:', result.token);
      setToken(result.token);
      console.log('Stored token:', getToken());
      sessionStorage.setItem('username', result.user.username);
      sessionStorage.setItem('fullName', `${result.user.firstName} ${result.user.lastName}`);
      localStorage.setItem('activeNavItem', 'home');
      window.location.href = 'home.html';
    } catch (error) {
      console.error('Login request failed:', error);
      alert('Unable to login. Please try again later.');
    }
  });
}

async function performLogin(loginId, password) {
  return apiPost(`${AUTH_API_BASE}/login`, { loginId, password });
}

if (signupForm) {
  signupForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const dob = document.getElementById('signupDob').value;
    const gender = document.getElementById('signupGender').value;

    if (!firstName || !lastName || !username || !password || !dob || !gender) {
      alert('Please complete all required signup fields.');
      return;
    }

    if (!email && !phone) {
      alert('Please provide either an email address or mobile number.');
      return;
    }

    try {
      const response = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobile: phone,
          username,
          password,
          dateOfBirth: dob,
          gender,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.message || 'Signup failed.');
        return;
      }

      const loginId = email || phone;
      const { response: loginResponse, data: loginResult } = await performLogin(loginId, password);

      if (loginResponse.ok) {
        resetUserSession();
        setToken(loginResult.token);
        sessionStorage.setItem('username', loginResult.user.username);
        sessionStorage.setItem('fullName', `${loginResult.user.firstName} ${loginResult.user.lastName}`);
        localStorage.setItem('activeNavItem', 'home');
        window.location.href = 'home.html';
        return;
      }

      signupForm.reset();
      alert('Account created successfully. Please log in.');
      showLoginPanel();
    } catch (error) {
      console.error('Signup request failed:', error);
      alert('Unable to sign up. Please try again later.');
    }
  });
}

const setupForm = document.getElementById('setupForm');
if (setupForm) {
  setupForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    if (!username || !fullName) {
      alert('Please enter both a username and full name.');
      return;
    }
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('fullName', fullName);
    localStorage.setItem('activeNavItem', 'home');
    window.location.href = 'home.html';
  });
}

const logoutButton = document.getElementById('logout');
if (logoutButton) {
  logoutButton.addEventListener('click', function () {
    resetUserSession();
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
}

// Forgot Password Form Handler
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const messageDiv = document.getElementById('message');

    if (!email) {
      messageDiv.textContent = 'Please enter your email address.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
      return;
    }

    try {
      const response = await fetch(`${AUTH_API_BASE}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      messageDiv.textContent = result.message;
      messageDiv.className = response.ok ? 'message success' : 'message error';
      messageDiv.style.display = 'block';

      if (response.ok) {
        forgotPasswordForm.reset();
      }
    } catch (error) {
      console.error('Forgot password request failed:', error);
      messageDiv.textContent = 'Unable to send reset link. Please try again later.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
    }
  });
}

// Reset Password Form Handler
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('message');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      messageDiv.textContent = 'Invalid reset link. Please request a new password reset.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
      return;
    }

    if (newPassword.length < 6) {
      messageDiv.textContent = 'Password must be at least 6 characters long.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
      return;
    }

    if (newPassword !== confirmPassword) {
      messageDiv.textContent = 'Passwords do not match.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
      return;
    }

    try {
      const response = await fetch(`${AUTH_API_BASE}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      messageDiv.textContent = result.message;
      messageDiv.className = response.ok ? 'message success' : 'message error';
      messageDiv.style.display = 'block';

      if (response.ok) {
        resetPasswordForm.reset();
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password request failed:', error);
      messageDiv.textContent = 'Unable to reset password. Please try again later.';
      messageDiv.className = 'message error';
      messageDiv.style.display = 'block';
    }
  });
}

function isProtectedPage() {
  return document.body.dataset.protected === 'true';
}

async function fetchCurrentUser() {
  const { response, data } = await apiGet('/api/user/me');
  if (!response.ok || !data.user) {
    throw new Error(data.message || 'Unable to fetch user data.');
  }

  const user = data.user;
  sessionStorage.setItem('username', user.username);
  sessionStorage.setItem('fullName', `${user.firstName} ${user.lastName}`);

  const profile = {
    userId: user.userId,
    username: user.username,
    fullName: `${user.firstName} ${user.lastName}`,
    avatar: user.avatar || '',
    bio: user.bio || 'Share your story and show your best moments.',
    followers: user.followers || 0,
    following: user.following || 0,
  };

  localStorage.setItem('SocialixProfile', JSON.stringify(profile));
  window.currentUserProfile = profile;
  return profile;
}

async function fetchUserById(userId) {
  const { response, data } = await apiGet(`${SOCIAL_API_BASE}/users/${userId}`);
  if (!response.ok || !data.user) {
    throw new Error(data.message || 'Unable to fetch user data.');
  }

  const user = data.user;
  const profile = {
    userId: user.userId,
    username: user.username,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`,
    avatar: user.avatar || '',
    bio: user.bio || 'Share your story and show your best moments.',
    followers: user.followers || 0,
    following: user.following || 0,
    isFollowing: Boolean(user.isFollowing),
    isMine: Boolean(user.isMine),
  };

  return profile;
}

async function fetchCommentsForPost(postId) {
  if (!postId) {
    return [];
  }
  const { response, data } = await apiGet(`${SOCIAL_API_BASE}/comments/${postId}`);
  if (!response.ok) {
    console.error('Unable to load comments for post', postId, data.message || response.status);
    return [];
  }
  return Array.isArray(data.comments) ? data.comments : [];
}

function renderCommentsHtml(comments) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return '<div class="comment-list-empty">No comments yet.</div>';
  }
  return comments
    .map(function (comment) {
      return `
        <div class="comment-item" data-comment-id="${comment.id}">
          <div class="comment-item-text">
            <strong>${comment.author.username}</strong> ${comment.text}
          </div>
          ${comment.isMine ? `<button type="button" class="icon-button delete-comment-button" data-action="delete-comment" data-comment-id="${comment.id}" aria-label="Delete comment">✕</button>` : ''}
        </div>
      `;
    })
    .join('');
}

function getPostCommentsCount(postId) {
  const comments = (window.currentCommentsByPost && window.currentCommentsByPost[postId]) || [];
  return comments.length;
}

async function applyProtectedPage() {
  if (!isProtectedPage()) {
    return;
  }

  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const user = await fetchCurrentUser();
    const fullNameElement = document.getElementById('fullNameDisplay');
    const usernameElement = document.getElementById('usernameDisplay');
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (fullNameElement) fullNameElement.textContent = user.username;
    if (usernameElement) usernameElement.textContent = user.username;
    if (welcomeMessage) welcomeMessage.textContent = `Welcome back, ${user.fullName}. Your latest stories and posts appear here.`;
  } catch (error) {
    resetUserSession();
    window.location.href = 'index.html';
  }
}

function setActiveNav(items, activeKey) {
  let matched = false;
  items.forEach(function (link) {
    const isActive = link.dataset.page === activeKey;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
    if (isActive) {
      matched = true;
    }
  });

  if (!matched && items.length) {
    items[0].classList.add('active');
    items[0].setAttribute('aria-current', 'page');
  }
}

function applySidebarState() {
  const navLinks = Array.from(document.querySelectorAll('.sidebar-nav a[data-page]'));
  const toggleButton = document.getElementById('sidebarToggle');
  const storedActive = localStorage.getItem('activeNavItem');
  const storedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

  if (storedCollapsed) {
    document.body.classList.add('sidebar-collapsed');
  }

  if (navLinks.length) {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
    const currentPageIsNav = navLinks.some(function (link) {
      return link.dataset.page === currentPage;
    });
    const activePage = currentPageIsNav ? currentPage : (storedActive || 'home');
    setActiveNav(navLinks, activePage);

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        localStorage.setItem('activeNavItem', link.dataset.page);
      });
    });
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed'));
    });
  }
}

function getStoredPosts() {
  const postsJSON = localStorage.getItem('posts') || localStorage.getItem('reelsPosts');
  if (!postsJSON) {
    return [];
  }
  try {
    return JSON.parse(postsJSON);
  } catch (error) {
    console.error('Unable to parse stored posts:', error);
    return [];
  }
}

function saveStoredPosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts));
}

function getStoredStories() {
  const storiesJSON = localStorage.getItem('stories');
  if (!storiesJSON) {
    return [];
  }
  try {
    return JSON.parse(storiesJSON);
  } catch (error) {
    console.error('Unable to parse stored stories:', error);
    return [];
  }
}

function saveStoredStories(stories) {
  localStorage.setItem('stories', JSON.stringify(stories));
}

function getCurrentUsername() {
  return sessionStorage.getItem('username') || 'socialix';
}

function getCurrentUserFullName() {
  return sessionStorage.getItem('fullName') || 'Socialix User';
}

function getCurrentUserAvatar() {
  return getProfileData().avatar || '';
}

function getAuthorName(post) {
  return post.author || getCurrentUsername();
}

function getAuthorAvatar(post) {
  return post.authorAvatar || getCurrentUserAvatar();
}

function getPostById(postId) {
  const allPosts = [].concat(window.currentProfilePosts || [], window.currentReelsPosts || [], window.currentFeedPosts || []);
  return allPosts.find(function (post) {
    return post.id === postId;
  });
}

function getProfileData() {
  const stored = localStorage.getItem('SocialixProfile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Unable to parse profile data:', error);
    }
  }

  const username = sessionStorage.getItem('username') || 'socialix';
  const fullName = sessionStorage.getItem('fullName') || 'Socialix User';
  return {
    userId: '',
    username: username,
    fullName: fullName,
    bio: 'Share your story and show your best moments.',
    avatar: '',
    followers: 0,
    following: 0,
  };
}

function saveProfileData(profile) {
  localStorage.setItem('SocialixProfile', JSON.stringify(profile));
}

function getCurrentUserId() {
  return getProfileData().userId || '';
}

async function fetchAllPosts() {
  const { response, data } = await apiGet(`${SOCIAL_API_BASE}/posts`);
  if (!response.ok) {
    throw new Error(data.message || 'Unable to load posts.');
  }
  return Array.isArray(data.posts) ? data.posts : [];
}

async function fetchUserPosts(userId) {
  const id = userId || getCurrentUserId() || 'me';
  const { response, data } = await apiGet(`${SOCIAL_API_BASE}/posts/user/${id}`);
  if (!response.ok) {
    throw new Error(data.message || 'Unable to load user posts.');
  }
  return Array.isArray(data.posts) ? data.posts : [];
}

function broadcastPostSync(postId) {
  try {
    localStorage.setItem('SocialixLastPostSync', JSON.stringify({ postId, timestamp: Date.now() }));
  } catch (error) {
    console.error('Unable to broadcast post sync event:', error);
  }
}

function registerPostSyncListeners() {
  window.addEventListener('storage', function (event) {
    if (event.key !== 'SocialixLastPostSync') {
      return;
    }

    if (window.location.pathname.endsWith('/home.html')) {
      renderHomeFeed();
    }
    if (window.location.pathname.endsWith('/reels.html')) {
      renderReelsFeed();
    }
    if (window.location.pathname.endsWith('/profile.html')) {
      renderProfilePosts();
      renderProfileHeader();
    }
  });
}

async function fetchReelsPosts() {
  const { response, data } = await apiGet(`${SOCIAL_API_BASE}/posts/reels`);
  if (!response.ok) {
    throw new Error(data.message || 'Unable to load reels.');
  }
  return Array.isArray(data.posts) ? data.posts : [];
}

function updateAvatarPlaceholder(textId, initials) {
  const placeholder = document.getElementById(textId);
  if (placeholder) {
    placeholder.textContent = initials;
  }
}

function renderProfileHeader() {
  const profile = getProfileData();
  const usernameEl = document.getElementById('profileUsername');
  const fullNameEl = document.getElementById('profileFullName');
  const bioEl = document.getElementById('profileBio');
  const followersEl = document.getElementById('followersCount');
  const followingEl = document.getElementById('followingCount');
  const postsEl = document.getElementById('postsCount');
  const avatarImage = document.getElementById('profileAvatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');

  if (usernameEl) usernameEl.textContent = `@${profile.username}`;
  if (fullNameEl) fullNameEl.textContent = profile.fullName;
  if (bioEl) bioEl.textContent = profile.bio;
  if (followersEl) followersEl.textContent = profile.followers;
  if (followingEl) followingEl.textContent = profile.following;
  if (postsEl) postsEl.textContent = window.currentProfilePosts ? window.currentProfilePosts.length : getStoredPosts().length;

  if (profile.avatar) {
    if (avatarImage) {
      avatarImage.src = profile.avatar;
      avatarImage.style.display = 'block';
    }
    if (avatarPlaceholder) {
      avatarPlaceholder.style.display = 'none';
    }
  } else {
    if (avatarImage) {
      avatarImage.src = '';
      avatarImage.style.display = 'none';
    }
    if (avatarPlaceholder) {
      avatarPlaceholder.style.display = 'grid';
      const initials = profile.fullName
        .split(' ')
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .slice(0, 2)
        .join('');
      avatarPlaceholder.textContent = initials || 'T';
    }
  }
}

function renderUserHeader(profile) {
  const usernameEl = document.getElementById('profileUsername');
  const fullNameEl = document.getElementById('profileFullName');
  const bioEl = document.getElementById('profileBio');
  const followersEl = document.getElementById('followersCount');
  const followingEl = document.getElementById('followingCount');
  const postsEl = document.getElementById('postsCount');
  const avatarImage = document.getElementById('profileAvatarImage');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const followButton = document.getElementById('followToggleButton');

  if (usernameEl) usernameEl.textContent = `@${profile.username}`;
  if (fullNameEl) fullNameEl.textContent = profile.fullName;
  if (bioEl) bioEl.textContent = profile.bio;
  if (followersEl) followersEl.textContent = profile.followers;
  if (followingEl) followingEl.textContent = profile.following;
  if (postsEl) postsEl.textContent = window.currentProfilePosts ? window.currentProfilePosts.length : 0;

  if (avatarImage) {
    if (profile.avatar) {
      avatarImage.src = profile.avatar;
      avatarImage.style.display = 'block';
    } else {
      avatarImage.src = '';
      avatarImage.style.display = 'none';
    }
  }

  if (avatarPlaceholder) {
    if (profile.avatar) {
      avatarPlaceholder.style.display = 'none';
    } else {
      avatarPlaceholder.style.display = 'grid';
      const initials = profile.fullName
        .split(' ')
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .slice(0, 2)
        .join('');
      avatarPlaceholder.textContent = initials || 'T';
    }
  }

  if (followButton) {
    followButton.textContent = profile.isFollowing ? 'Following' : 'Follow';
    followButton.classList.toggle('secondary-button', profile.isFollowing);
    followButton.classList.toggle('primary-button', !profile.isFollowing);
    followButton.dataset.userId = profile.userId;
    followButton.style.display = profile.isMine ? 'none' : 'inline-flex';
  }
}

async function renderProfilePosts(userId) {
  const grid = document.getElementById('profilePostsGrid');
  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div class="posts-empty loading-state">
      <strong>Loading posts...</strong>
    </div>
  `;

  try {
    const id = userId || getCurrentUserId() || 'me';
    const posts = await fetchUserPosts(id);
    window.currentProfilePosts = posts;
    grid.innerHTML = '';

    if (!posts.length) {
      grid.innerHTML = `
        <div class="posts-empty">
          <strong>No posts yet.</strong>
          <p>Share photos and videos from the Create page to see them here.</p>
        </div>
      `;
      return;
    }

    posts.forEach(function (post) {
      const postCard = document.createElement('article');
      postCard.className = 'profile-post-card';
      postCard.dataset.postId = post.id;

      const media = document.createElement(post.mediaType === 'video' ? 'video' : 'img');
      media.setAttribute('src', post.mediaUrl);
      media.setAttribute('alt', post.caption || 'Profile post');
      if (post.mediaType === 'video') {
        media.controls = true;
        media.playsInline = true;
      }

      const overlay = document.createElement('div');
      overlay.className = 'post-overlay';
      overlay.innerHTML = `
        <span>❤️ ${post.likes}</span>
        <span>💬 ${post.comments}</span>
      `;

      postCard.appendChild(media);
      postCard.appendChild(overlay);
      grid.appendChild(postCard);
    });
  } catch (error) {
    console.error('Profile posts render error:', error);
    grid.innerHTML = `
      <div class="posts-empty">
        <strong>Unable to load posts.</strong>
        <p>Refresh the page or try again later.</p>
      </div>
    `;
    window.currentProfilePosts = [];
  }
}

function openEditProfileModal() {
  const profile = getProfileData();
  const modal = document.getElementById('editProfileModal');
  const fullNameField = document.getElementById('editFullName');
  const usernameField = document.getElementById('editUsername');
  const bioField = document.getElementById('editBio');
  const previewImage = document.getElementById('profilePhotoPreviewImage');
  const photoPlaceholder = document.getElementById('photoPlaceholder');

  if (fullNameField) fullNameField.value = profile.fullName;
  if (usernameField) usernameField.value = profile.username;
  if (bioField) bioField.value = profile.bio;

  if (profile.avatar) {
    if (previewImage) {
      previewImage.src = profile.avatar;
      previewImage.style.display = 'block';
    }
    if (photoPlaceholder) {
      photoPlaceholder.style.display = 'none';
    }
  } else {
    if (previewImage) {
      previewImage.src = '';
      previewImage.style.display = 'none';
    }
    if (photoPlaceholder) {
      photoPlaceholder.textContent = profile.fullName
        .split(' ')
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .slice(0, 2)
        .join('');
      photoPlaceholder.style.display = 'grid';
    }
  }

  if (modal) {
    modal.classList.remove('hide');
  }
}

function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.classList.add('hide');
  }
}

function closePostPreviewModal() {
  const modal = document.getElementById('postPreviewModal');
  if (modal) {
    modal.classList.add('hide');
  }
}

function openPostPreview(postId) {
  const post = getPostById(postId);
  if (!post) {
    return;
  }

  const modal = document.getElementById('postPreviewModal');
  const content = document.getElementById('postPreviewContent');
  if (!modal || !content) {
    return;
  }

  content.innerHTML = `
    <div class="preview-post-media">
      ${post.mediaType === 'video' ? `<video src="${post.mediaUrl}" controls playsinline></video>` : `<img src="${post.mediaUrl}" alt="Post preview">`}
    </div>
    <div class="preview-post-details">
      <p class="reel-caption">${post.caption || 'No caption added.'}</p>
      <div class="reel-actions">
        <span>❤️ ${post.likes}</span>
        <span>💬 ${post.comments}</span>
      </div>
    </div>
  `;
  modal.dataset.currentPost = postId;
  modal.classList.remove('hide');
}

async function deletePost(postId) {
  try {
    const { response, data } = await apiDelete(`${SOCIAL_API_BASE}/posts/${postId}`);
    if (!response.ok) {
      throw data;
    }

    await renderProfilePosts();
    renderProfileHeader();
    await renderReelsFeed();
    closePostPreviewModal();
  } catch (error) {
    console.error('Post delete error:', error);
    alert(error.message || 'Unable to delete post.');
  }
}

async function initializeProfilePage() {
  const pageName = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
  if (pageName !== 'profile') {
    return;
  }

  try {
    await fetchCurrentUser();
  } catch (error) {
    resetUserSession();
    window.location.href = 'index.html';
    return;
  }

  renderProfileHeader();
  await renderProfilePosts();
  renderProfileHeader();

  const editButton = document.getElementById('editProfileButton');
  const closeEditButton = document.getElementById('closeEditProfileModal');
  const cancelProfileButton = document.getElementById('cancelProfileButton');
  const editForm = document.getElementById('editProfileForm');
  const photoInput = document.getElementById('profilePhotoInput');
  const photoPreview = document.getElementById('profilePhotoPreviewImage');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  const postsGrid = document.getElementById('profilePostsGrid');
  const deletePostButton = document.getElementById('deletePostButton');
  const closePreviewButtons = [
    document.getElementById('closePostPreviewModal'),
    document.getElementById('closePostActionButton'),
  ];

  let avatarDataUrl = null;

  function updatePhotoPreview(imageSrc) {
    if (photoPreview) {
      photoPreview.src = imageSrc;
      photoPreview.style.display = 'block';
    }
    if (photoPlaceholder) {
      photoPlaceholder.style.display = 'none';
    }
  }

  if (editButton) {
    editButton.addEventListener('click', function () {
      avatarDataUrl = null;
      openEditProfileModal();
    });
  }

  if (closeEditButton) {
    closeEditButton.addEventListener('click', function () {
      avatarDataUrl = null;
      closeEditProfileModal();
    });
  }

  if (cancelProfileButton) {
    cancelProfileButton.addEventListener('click', function () {
      avatarDataUrl = null;
      closeEditProfileModal();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = function (loadEvent) {
        avatarDataUrl = loadEvent.target.result;
        updatePhotoPreview(avatarDataUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const profile = getProfileData();
      const fullName = document.getElementById('editFullName').value.trim();
      const username = document.getElementById('editUsername').value.trim();
      const bio = document.getElementById('editBio').value.trim();

      profile.fullName = fullName || profile.fullName;
      profile.username = username || profile.username;
      profile.bio = bio || profile.bio;
      if (avatarDataUrl) {
        profile.avatar = avatarDataUrl;
      }
      saveProfileData(profile);
      sessionStorage.setItem('fullName', profile.fullName);
      sessionStorage.setItem('username', profile.username);
      renderProfileHeader();
      closeEditProfileModal();
    });
  }

  if (postsGrid) {
    postsGrid.addEventListener('click', function (event) {
      const postCard = event.target.closest('.profile-post-card');
      if (!postCard) {
        return;
      }
      openPostPreview(postCard.dataset.postId);
    });
  }

  if (deletePostButton) {
    deletePostButton.addEventListener('click', function () {
      const previewModal = document.getElementById('postPreviewModal');
      const currentPostId = previewModal ? previewModal.dataset.currentPost : '';
      if (currentPostId) {
        deletePost(currentPostId);
      }
    });
  }

  closePreviewButtons.forEach(function (button) {
    if (button) {
      button.addEventListener('click', closePostPreviewModal);
    }
  });
}

async function toggleFollowUser(userId) {
  const { response, data } = await apiPost(`${SOCIAL_API_BASE}/follow/${userId}`, {});
  if (!response.ok) {
    throw new Error(data.message || 'Unable to update follow state.');
  }
  return data;
}

async function initializeUserPage() {
  const pageName = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
  if (pageName !== 'user') {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  if (!userId) {
    window.location.href = 'profile.html';
    return;
  }

  try {
    const profile = await fetchUserById(userId);
    if (profile.isMine) {
      window.location.href = 'profile.html';
      return;
    }

    renderUserHeader(profile);
    await renderProfilePosts(userId);
    renderUserHeader(profile);

    const followButton = document.getElementById('followToggleButton');
    if (followButton) {
      followButton.addEventListener('click', async function () {
        try {
          await toggleFollowUser(userId);
          profile.isFollowing = !profile.isFollowing;
          profile.followers += profile.isFollowing ? 1 : -1;
          renderUserHeader(profile);
        } catch (error) {
          console.error('Follow toggle error:', error);
          alert(error.message || 'Unable to update follow status.');
        }
      });
    }

    const postsGrid = document.getElementById('profilePostsGrid');
    if (postsGrid) {
      postsGrid.addEventListener('click', function (event) {
        const postCard = event.target.closest('.profile-post-card');
        if (!postCard) {
          return;
        }
        openPostPreview(postCard.dataset.postId);
      });
    }
  } catch (error) {
    console.error('User profile load error:', error);
    alert(error.message || 'Unable to load this profile.');
    window.location.href = 'search.html';
  }
}

async function renderHomeFeed() {
  const homeFeed = document.getElementById('homeFeed');
  if (!homeFeed) {
    return;
  }

  homeFeed.innerHTML = `
    <div class="empty-state loading-state">
      <strong>Loading feed...</strong>
    </div>
  `;

  try {
    const posts = await fetchAllPosts();
    if (!posts.length) {
      homeFeed.innerHTML = `
        <div class="empty-state">
          <strong>No posts yet.</strong>
          <p>Posts from people you follow will appear here.</p>
        </div>
      `;
      window.currentFeedPosts = [];
      return;
    }

    window.currentFeedPosts = posts;
    window.currentCommentsByPost = {};
    homeFeed.innerHTML = '';

    await Promise.all(posts.map(async function (post) {
      window.currentCommentsByPost[post.id] = await fetchCommentsForPost(post.id);
    }));

    posts.forEach(function (post) {
      const comments = window.currentCommentsByPost[post.id] || [];
      const card = document.createElement('article');
      card.className = 'feed-card';
      card.dataset.postId = post.id;

      card.innerHTML = `
        <div class="feed-author-row">
          <div class="feed-author">
            <div class="story-thumb ${post.author.avatar ? 'has-image' : ''}">
              ${post.author.avatar ? `<img src="${post.author.avatar}" alt="${post.author.username} avatar">` : `<span>${post.author.username.charAt(0).toUpperCase()}</span>`}
            </div>
            <div>
              <strong>${post.author.username}</strong>
            </div>
          </div>
          <div class="feed-author-actions">
            ${!post.isMine ? `<button type="button" class="secondary-button follow-button ${post.isFollowingAuthor ? 'following' : ''}" data-author-id="${post.author.userId}">${post.isFollowingAuthor ? 'Following' : 'Follow'}</button>` : ''}
          </div>
          <div class="post-menu">
            <button type="button" class="icon-button post-menu-button" data-action="menu" aria-label="Post options">⋮</button>
            <div class="post-menu-dropdown hide">
              ${post.isMine ? '<button type="button" class="menu-item delete-post-button" data-action="delete-post">Delete</button>' : ''}
            </div>
          </div>
        </div>
        <div class="feed-media">
          ${post.mediaType === 'video'
          ? `<video src="${post.mediaUrl}" controls playsinline></video>`
          : `<img src="${post.mediaUrl}" alt="${post.caption ? post.caption : 'Feed post'}">`}
        </div>
        <div class="feed-text">
          <div class="feed-actions">
            <button type="button" class="icon-button like-button" data-action="like">
              <span>${post.liked ? '❤️' : '🤍'}</span>
              <span class="action-count">${post.likes}</span>
            </button>
            <button type="button" class="icon-button comment-button" data-action="comment">
              <span>💬</span>
              <span class="action-count">${post.comments}</span>
            </button>
          </div>
          <p class="feed-caption"><strong>${post.author.username}</strong> ${post.caption || ''}</p>
          <div class="comment-list hide" data-post-id="${post.id}">
            ${renderCommentsHtml(comments)}
          </div>
          <div class="comment-box hide">
            <input type="text" class="comment-input" placeholder="Add a comment..." />
            <button type="button" class="secondary-button post-comment-button">Post</button>
          </div>
        </div>
      `;

      homeFeed.appendChild(card);
    });
  } catch (error) {
    console.error('Feed render error:', error);
    homeFeed.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load feed.</strong>
        <p>Try refreshing the page.</p>
      </div>
    `;
    window.currentFeedPosts = [];
  }
}

async function loadReelComments(postId) {
  const comments = await fetchCommentsForPost(postId);
  window.currentCommentsByPost = window.currentCommentsByPost || {};
  window.currentCommentsByPost[postId] = comments;

  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (commentsContainer) {
    commentsContainer.innerHTML = renderCommentsHtml(comments);
  }

  return comments;
}

function mapStoryGroups(rawGroups) {
  const groups = Array.isArray(rawGroups) ? rawGroups : [];
  return groups.map((group) => ({
    ...group,
    stories: Array.isArray(group.stories) ? group.stories.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [],
  }));
}

async function renderStories() {
  const storiesRow = document.getElementById('storiesRow');
  if (!storiesRow) {
    return;
  }

  storiesRow.innerHTML = `
    <div class="story-loading">
      Loading stories...
    </div>
  `;

  try {
    const { response, data } = await apiGet(`${SOCIAL_API_BASE}/stories`);
    if (!response.ok) {
      throw data;
    }

    const storyGroups = mapStoryGroups(data.storyGroups || []);
    window.currentStoryGroups = storyGroups;
    storiesRow.innerHTML = '';

    const addCard = document.createElement('article');
    addCard.className = 'story-card story-add-story';
    addCard.innerHTML = `
      <button type="button" class="story-button add-story-button">
        <div class="story-frame story-frame-add">
          <span>+</span>
        </div>
        <div class="story-meta">
          <strong>Your Story</strong>
          <span>Share a moment</span>
        </div>
      </button>
    `;
    storiesRow.appendChild(addCard);

    storyGroups.forEach(function (group) {
      const card = document.createElement('article');
      card.className = 'story-card';
      card.dataset.userId = group.author.userId;
      card.innerHTML = `
        <button type="button" class="story-button" data-user-id="${group.author.userId}">
          <div class="story-frame ${group.storyCount > 0 ? 'story-frame-active' : ''}">
            ${group.author.avatar
          ? `<img class="story-avatar" src="${group.author.avatar}" alt="${group.author.username} profile">`
          : `<span>${group.author.username.charAt(0).toUpperCase()}</span>`}
          </div>
          <div class="story-meta">
            <strong>${group.isMine ? 'Your Story' : group.author.username}</strong>
            <span>${group.storyCount} ${group.storyCount === 1 ? 'story' : 'stories'}</span>
          </div>
        </button>
      `;
      storiesRow.appendChild(card);
    });
  } catch (error) {
    console.error('Stories render error:', error);
    storiesRow.innerHTML = `
      <div class="story-card story-empty">
        <strong>Unable to load stories.</strong>
        <p>Refresh to try again.</p>
      </div>
    `;
    window.currentStoryGroups = [];
  }
}

function renderCurrentStory() {
  const group = window.currentStoryGroup;
  const index = window.currentStoryIndex || 0;
  const modal = document.getElementById('storyModal');
  const content = document.getElementById('storyModalContent');
  if (!group || !content || !modal) {
    return;
  }

  const story = group.stories[index];
  if (!story) {
    return;
  }

  const progressItems = group.stories
    .map((_, idx) => `<span class="story-progress-segment ${idx === index ? 'active' : ''}"></span>`)
    .join('');

  content.innerHTML = `
    <div class="story-modal-top">
      <div class="story-progress">${progressItems}</div>
      <div class="story-modal-actions">
        <button type="button" class="story-options-button modal-story-options" id="storyOptionsToggle" aria-label="Story options">⋮</button>
        <div class="story-menu-dropdown hide" id="storyModalDropdown">
          ${group.isMine ? '<button type="button" class="menu-item delete-current-story-button">Delete Story</button>' : ''}
        </div>
      </div>
    </div>
    <div class="story-viewer">
      ${story.mediaType === 'video'
      ? `<video src="${story.mediaUrl}" controls autoplay playsinline muted></video>`
      : `<img src="${story.mediaUrl}" alt="${group.author.username}'s story">`}
    </div>
    <div class="story-details story-details-modal">
      <div>
        <strong>${group.isMine ? 'Your Story' : group.author.username}</strong>
        <p>${story.caption || ''}</p>
      </div>
      <time>${new Date(story.createdAt).toLocaleString()}</time>
    </div>
    <div class="story-navigation">
      <button type="button" class="icon-button story-nav-button" data-nav="prev" aria-label="Previous story">←</button>
      <button type="button" class="icon-button story-nav-button" data-nav="next" aria-label="Next story">→</button>
    </div>
  `;

  modal.dataset.currentUserId = group.author.userId;
  modal.dataset.currentIndex = index.toString();
  modal.dataset.currentStoryId = story.id;
  modal.classList.remove('hide');
}

function startStoryTimer() {
  clearTimeout(window.storyTimer);
  window.storyTimer = setTimeout(() => {
    goToNextStory();
  }, 4500);
}

function stopStoryTimer() {
  clearTimeout(window.storyTimer);
}

function goToNextStory() {
  const group = window.currentStoryGroup;
  if (!group) {
    return;
  }

  const nextIndex = (window.currentStoryIndex || 0) + 1;
  if (nextIndex >= group.stories.length) {
    closeStoryModal();
    return;
  }

  window.currentStoryIndex = nextIndex;
  renderCurrentStory();
  startStoryTimer();
}

function goToPreviousStory() {
  const group = window.currentStoryGroup;
  if (!group) {
    return;
  }

  const prevIndex = Math.max((window.currentStoryIndex || 0) - 1, 0);
  window.currentStoryIndex = prevIndex;
  renderCurrentStory();
  startStoryTimer();
}

async function openStoryModal(userId, startIndex = 0) {
  const groups = window.currentStoryGroups || [];
  const group = groups.find((item) => item.author.userId.toString() === userId.toString());
  if (!group || group.stories.length === 0) {
    return;
  }

  window.currentStoryGroup = group;
  window.currentStoryIndex = Math.min(Math.max(startIndex, 0), group.stories.length - 1);
  renderCurrentStory();
  startStoryTimer();
}

function closeStoryModal() {
  stopStoryTimer();
  const modal = document.getElementById('storyModal');
  if (modal) {
    modal.classList.add('hide');
  }
}

async function deleteStory(storyId) {
  try {
    const { response, data } = await apiDelete(`${SOCIAL_API_BASE}/stories/${storyId}`);
    if (!response.ok) {
      throw data;
    }

    const currentGroupId = window.currentStoryGroup ? window.currentStoryGroup.author.userId : null;
    const currentIndex = window.currentStoryIndex || 0;

    await renderStories();

    if (currentGroupId) {
      const refreshedGroup = (window.currentStoryGroups || []).find(
        (item) => item.author.userId.toString() === currentGroupId.toString()
      );
      if (refreshedGroup && refreshedGroup.stories.length > 0) {
        window.currentStoryGroup = refreshedGroup;
        window.currentStoryIndex = Math.min(currentIndex, refreshedGroup.stories.length - 1);
        renderCurrentStory();
        startStoryTimer();
      } else {
        closeStoryModal();
      }
    } else {
      closeStoryModal();
    }
  } catch (error) {
    console.error('Delete story failed:', error);
    alert(error.message || 'Unable to delete story.');
  }
}

async function initializeHomePage() {
  const pageName = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
  if (pageName !== 'home') {
    return;
  }

  await Promise.all([renderHomeFeed(), renderStories()]);

  const addButton = document.getElementById('addStoryButton');
  const storyInput = document.getElementById('storyInput');
  const homeFeed = document.getElementById('homeFeed');
  const storiesRow = document.getElementById('storiesRow');
  const closeStoryButton = document.getElementById('closeStoryModal');
  const deleteStoryButton = document.getElementById('deleteStoryButton');

  if (addButton && storyInput) {
    addButton.addEventListener('click', function () {
      storyInput.click();
    });

    storyInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const acceptedTypes = ['image/', 'video/mp4', 'video/webm'];
      const isValidType = acceptedTypes.some(function (type) {
        return file.type.startsWith(type);
      });

      if (!isValidType) {
        alert('Please choose a valid photo or video for your story.');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async function (loadEvent) {
        const mediaUrl = loadEvent.target.result;
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

        const { response, data } = await apiPost(`${SOCIAL_API_BASE}/stories`, {
          mediaUrl,
          mediaType,
          caption: '',
        });

        if (!response.ok) {
          alert(data.message || 'Unable to upload story.');
          event.target.value = '';
          return;
        }

        await renderStories();
        event.target.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  if (homeFeed) {
    homeFeed.addEventListener('click', async function (event) {
      const followButton = event.target.closest('.follow-button');
      if (followButton) {
        const card = followButton.closest('.feed-card');
        const postId = card ? card.dataset.postId : '';
        const post = postId ? (window.currentFeedPosts || []).find((item) => item.id === postId) : null;
        if (post && post.author && post.author.userId) {
          const { response, data } = await apiPost(`${SOCIAL_API_BASE}/follow/${post.author.userId}`, {});
          if (response.ok) {
            post.isFollowingAuthor = data.following;
            await renderHomeFeed();
          } else {
            alert(data.message || 'Unable to update follow status.');
          }
        }
        return;
      }
      

      const button = event.target.closest('[data-action], .post-comment-button, .delete-comment-button');
      const card = event.target.closest('.feed-card');
      if (!button || !card) return;

      const postId = card.dataset.postId;

      if (button.dataset.action === 'like') {
        const likeBtn = button;
        const icon = likeBtn.querySelector('span');
        const countSpan = likeBtn.querySelector('.action-count');

        const { response, data } = await apiPost(`${SOCIAL_API_BASE}/posts/${postId}/like`, {});

        if (response.ok) {
          // UI update without reload
          icon.textContent = data.liked ? '❤️' : '🤍';
          countSpan.textContent = data.likes;
        } else {
          alert(data.message || 'Like failed');
        }

        return;
      }

      if (button.dataset.action === 'comment') {
        const box = card.querySelector('.comment-box');
        const list = card.querySelector('.comment-list');
        if (box) box.classList.toggle('hide');
        if (list) list.classList.toggle('hide');
        return;
      }

      if (button.dataset.action === 'menu') {
        const dropdown = card.querySelector('.post-menu-dropdown');
        if (dropdown) dropdown.classList.toggle('hide');
        return;
      }

      if (button.dataset.action === 'delete-post') {
        if (!confirm('Delete this post?')) return;
        const { response, data } = await apiDelete(`${SOCIAL_API_BASE}/posts/${postId}`);
        if (response.ok) {
          await renderHomeFeed();
        } else {
          alert(data.message || 'Unable to delete post.');
        }
        return;
      }

      if (button.dataset.action === 'delete-comment' || button.classList.contains('delete-comment-button')) {
        const commentId = button.dataset.commentId || button.closest('[data-comment-id]')?.dataset.commentId;
        if (!commentId) return;
        if (!confirm('Delete this comment?')) return;

        const { response } = await apiDelete(`${SOCIAL_API_BASE}/comments/${commentId}`);
        if (response.ok) {
          const comments = await fetchCommentsForPost(postId);
          window.currentCommentsByPost = window.currentCommentsByPost || {};
          window.currentCommentsByPost[postId] = comments;

          const commentList = card.querySelector('.comment-list');
          if (commentList) {
            commentList.innerHTML = renderCommentsHtml(comments);
          }

          const commentCount = comments.length;
          post.comments = commentCount;
          const countBadge = card.querySelector('.comment-button .action-count');
          if (countBadge) {
            countBadge.textContent = String(commentCount);
          }
        } else {
          alert('Unable to delete comment.');
        }
        return;
      }

      if (button.classList.contains('post-comment-button')) {
        const input = card.querySelector('.comment-input');
        const text = input ? input.value.trim() : '';
        if (!text) {
          return;
        }

        const { response, data } = await apiPost(`${SOCIAL_API_BASE}/comments/${postId}`, { text });
        if (response.ok) {
          const newComment = data.comment;
          window.currentCommentsByPost = window.currentCommentsByPost || {};
          window.currentCommentsByPost[postId] = window.currentCommentsByPost[postId] || [];
          window.currentCommentsByPost[postId].push(newComment);
          const commentList = card.querySelector('.comment-list');
          if (commentList) {
            commentList.innerHTML = renderCommentsHtml(window.currentCommentsByPost[postId]);
            commentList.classList.remove('hide');
          }
          if (input) input.value = '';
          const newCommentCount = typeof data.comments === 'number' ? data.comments : window.currentCommentsByPost[postId].length;
          const countBadge = card.querySelector('.comment-button .action-count');
          if (countBadge) countBadge.textContent = String(newCommentCount);
          post.comments = newCommentCount;
        } else {
          alert(data.message || 'Unable to add comment.');
        }
        return;
      }

      if (button.classList.contains('post-menu-button')) {
        const dropdown = card.querySelector('.post-menu-dropdown');
        if (dropdown) {
          dropdown.classList.toggle('hide');
        }
        return;
      }

      if (button.classList.contains('delete-post-button')) {
        if (!confirm('Delete this post?')) {
          return;
        }

        const { response, data } = await apiDelete(`${SOCIAL_API_BASE}/posts/${postId}`);
        if (response.ok) {
          await renderHomeFeed();
        } else {
          alert(data.message || 'Unable to delete post.');
        }
        return;
      }

    });
  }

  if (storiesRow) {
    storiesRow.addEventListener('click', async function (event) {
      const addButton = event.target.closest('.add-story-button');
      if (addButton) {
        if (storyInput) {
          storyInput.click();
        }
        return;
      }

      const storyButton = event.target.closest('.story-button[data-user-id]');
      if (storyButton) {
        openStoryModal(storyButton.dataset.userId);
      }
    });
  }

  const storyModal = document.getElementById('storyModal');
  if (storyModal) {
    storyModal.addEventListener('click', async function (event) {
      const navButton = event.target.closest('.story-nav-button');
      if (navButton) {
        const direction = navButton.dataset.nav;
        if (direction === 'next') {
          goToNextStory();
        } else if (direction === 'prev') {
          goToPreviousStory();
        }
        return;
      }

      const optionsToggle = event.target.closest('#storyOptionsToggle');
      if (optionsToggle) {
        const dropdown = document.getElementById('storyModalDropdown');
        if (dropdown) {
          dropdown.classList.toggle('hide');
        }
        return;
      }

      const deleteCurrent = event.target.closest('.delete-current-story-button');
      if (deleteCurrent) {
        const currentStoryId = storyModal.dataset.currentStoryId;
        if (currentStoryId) {
          await deleteStory(currentStoryId);
        }
        return;
      }

      const outsideClick = event.target === storyModal;
      if (outsideClick) {
        closeStoryModal();
      }
    });
  }

  if (closeStoryButton) {
    closeStoryButton.addEventListener('click', closeStoryModal);
  }

  if (deleteStoryButton) {
    deleteStoryButton.addEventListener('click', async function () {
      const modal = document.getElementById('storyModal');
      const storyId = modal ? modal.dataset.currentStoryId : '';
      if (storyId) {
        await deleteStory(storyId);
      }
    });
  }
}

async function renderReelsFeed() {
  const reelsFeed = document.getElementById('reelsFeed');
  if (!reelsFeed) {
    return;
  }

  reelsFeed.innerHTML = `
    <div class="empty-state loading-state">
      <strong>Loading reels...</strong>
    </div>
  `;

  try {
    const posts = await fetchReelsPosts();
    window.currentReelsPosts = posts;
    reelsFeed.innerHTML = '';

    if (!posts.length) {
      reelsFeed.innerHTML = `
        <div class="empty-state">
          <strong>No reels yet.</strong>
          <p>Video posts will appear here once you upload them.</p>
        </div>
      `;
      return;
    }

    posts.forEach(function (post) {
      const card = document.createElement('article');
      card.className = 'reel-card';
      card.dataset.postId = post.id;

      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'reel-media';

      if (post.mediaType === 'video') {
        const video = document.createElement('video');
        video.src = post.mediaUrl;
        video.controls = true;
        video.loop = false;
        video.playsInline = true;
        mediaWrapper.appendChild(video);
      } else {
        const image = document.createElement('img');
        image.src = post.mediaUrl;
        image.alt = post.caption ? post.caption : 'Reel upload';
        mediaWrapper.appendChild(image);
      }

      // Create overlay container for all UI elements
      const overlayContainer = document.createElement('div');
      overlayContainer.className = 'reel-overlay';

      // Top-left: User info section
      const userInfoSection = document.createElement('div');
      userInfoSection.className = 'reel-user-info';
      const avatarImg = post.author.avatar
        ? `<img src="${post.author.avatar}" alt="${post.author.username}" class="reel-avatar" />`
        : `<div class="reel-avatar reel-avatar-placeholder">${post.author.username.charAt(0).toUpperCase()}</div>`;

      userInfoSection.innerHTML = `
        <div class="reel-user-header">
          ${avatarImg}
          <div class="reel-user-details">
            <p class="reel-username">${post.author.username}</p>
          </div>
        </div>
        ${
          !post.isMine
            ? `<button type="button" class="reel-follow-button ${post.isFollowingAuthor ? 'following' : ''}" data-action="follow-author" data-user-id="${post.author.userId}">
                 ${post.isFollowingAuthor ? 'Following' : 'Follow'}
               </button>`
            : ''
        }
      `;

      // Bottom-left: Caption section
      const captionSection = document.createElement('div');
      captionSection.className = 'reel-caption-section';
      captionSection.innerHTML = `
        <p class="reel-caption"><strong>${post.author.username}</strong> ${post.caption || 'No caption added.'}</p>
      `;

      // Right side: Action buttons
      const actionsSection = document.createElement('div');
      actionsSection.className = 'reel-actions-vertical';
      actionsSection.innerHTML = `
        <button type="button" class="icon-button-vertical like-button" data-action="like" title="Like">
          <span class="action-emoji">❤️</span>
          <span class="action-count">${post.likes}</span>
        </button>
        <button type="button" class="icon-button-vertical comment-button" data-action="comment" title="Comment">
          <span class="action-emoji">💬</span>
          <span class="action-count">${post.comments}</span>
        </button>
        ${
          post.isMine
            ? `<button type="button" class="icon-button-vertical delete-post-button" data-action="delete-post" title="Delete" aria-label="Delete post">
                 <span class="action-emoji">🗑️</span>
               </button>`
            : ''
        }
      `;

      // Comments section (hidden by default)
      const commentsSection = document.createElement('div');
      commentsSection.className = 'reel-comments-section hide';
      commentsSection.innerHTML = `
        <div class="comment-list" id="comments-${post.id}">Loading...</div>
        <div class="comment-box">
          <input type="text" class="comment-input" placeholder="Write a comment..." />
          <button type="button" class="secondary-button post-comment-button">Post</button>
        </div>
      `;

      overlayContainer.appendChild(userInfoSection);
      overlayContainer.appendChild(captionSection);
      overlayContainer.appendChild(actionsSection);

      mediaWrapper.appendChild(overlayContainer);
      card.appendChild(mediaWrapper);
      card.appendChild(commentsSection);
      reelsFeed.appendChild(card);
      loadReelComments(post.id);
    });
  } catch (error) {
    console.error('Reels render error:', error);
    reelsFeed.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load reels.</strong>
        <p>Refresh the page or try again later.</p>
      </div>
    `;
    window.currentReelsPosts = [];
  }
}

async function initializeReelsPage() {
  const pageName = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
  if (pageName !== 'reels') return;

  await renderReelsFeed();

  const reelsFeed = document.getElementById('reelsFeed');

  reelsFeed.addEventListener('click', async function (event) {
    const button = event.target.closest('[data-action], .post-comment-button, .delete-comment-button, .delete-post-button');
    if (!button) return;

    const card = button.closest('.reel-card');
    if (!card) return;

    const postId = card.dataset.postId;
    if (!postId) return;

    const post = (window.currentReelsPosts || []).find((item) => item.id === postId);
    if (!post) return;

    //LIKE FIX
    if (button.dataset.action === 'like') {
      const { response, data } = await apiPost(`${SOCIAL_API_BASE}/posts/${postId}/like`, {});

      if (response.ok) {
        //UI UPDATE WITHOUT RELOAD
        const likeCountEl = button.querySelector('.action-count') || card.querySelector('.action-count');
        let currentLikes = parseInt(likeCountEl ? likeCountEl.innerText : '0', 10) || 0;

        if (data.liked) {
          currentLikes += 1;
          button.classList.add('liked');
        } else {
          currentLikes = Math.max(currentLikes - 1, 0);
          button.classList.remove('liked');
        }

        if (likeCountEl) {
          likeCountEl.innerText = currentLikes;
        }
      }
      return;
    }

    if (button.dataset.action === 'comment') {
      const section = card.querySelector('.reel-comments-section');
      if (section) {
        section.classList.toggle('hide');
      }
      return;
    }

    if (button.classList.contains('delete-post-button')) {
      if (!confirm('Delete this post?')) {
        return;
      }
      const { response, data } = await apiDelete(`${SOCIAL_API_BASE}/posts/${postId}`);
      if (response.ok) {
        await renderReelsFeed();
      } else {
        alert(data.message || 'Unable to delete post.');
      }
      return;
    }

    if (button.dataset.action === 'delete-comment' || button.classList.contains('delete-comment-button')) {
      const commentId = button.dataset.commentId || button.closest('[data-comment-id]')?.dataset.commentId;
      if (!commentId) {
        return;
      }
      if (!confirm('Delete this comment?')) {
        return;
      }
      const { response } = await apiDelete(`${SOCIAL_API_BASE}/comments/${commentId}`);
      if (response.ok) {
        const comments = await fetchCommentsForPost(postId);
        window.currentCommentsByPost = window.currentCommentsByPost || {};
        window.currentCommentsByPost[postId] = comments;
        const commentList = card.querySelector('.comment-list');
        if (commentList) {
          commentList.innerHTML = renderCommentsHtml(comments);
        }
        post.comments = comments.length;
        const count = card.querySelector('.comment-button .action-count');
        if (count) {
          count.textContent = post.comments;
        }
        const commentsSection = card.querySelector('.reel-comments-section');
        if (commentsSection && comments.length === 0) {
          commentsSection.classList.add('hide');
        }
      } else {
        alert(data.message || 'Unable to delete comment.');
      }
      return;
    }

    //COMMENT BOX TOGGLE
    if (button.classList.contains('post-comment-button')) {
      const input = card.querySelector('.comment-input');
      const commentText = input ? input.value.trim() : '';

      if (!commentText) return;

      const { response, data } = await apiPost(`${SOCIAL_API_BASE}/comments/${postId}`, {
        text: commentText
      });

      if (response.ok) {
        const newComment = data.comment;

        //Comment list find karo
        let commentList = card.querySelector('.comment-list');

        //Agar list exist nahi karti → create karo
        if (!commentList) {
          commentList = document.createElement('div');
          commentList.className = 'comment-list';
          const commentsSection = card.querySelector('.reel-comments-section');
          if (commentsSection) {
            commentsSection.insertBefore(commentList, commentsSection.querySelector('.comment-box'));
          }
        }

        //New comment add karo (without reload)
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.dataset.commentId = newComment.id;
        commentItem.innerHTML = `
          <div class="comment-item-text"><strong>${newComment.author.username}</strong> ${newComment.text}</div>
          ${newComment.isMine ? `<button type="button" class="icon-button delete-comment-button" data-action="delete-comment" data-comment-id="${newComment.id}" aria-label="Delete comment">✕</button>` : ''}
        `;

        window.currentCommentsByPost = window.currentCommentsByPost || {};
        window.currentCommentsByPost[postId] = window.currentCommentsByPost[postId] || [];
        window.currentCommentsByPost[postId].push(newComment);

        commentList.appendChild(commentItem);
        commentList.classList.remove('hide');

        //Clear input
        if (input) input.value = '';

        //Update comment count
        const commentCount = window.currentCommentsByPost[postId].length;
        const countElement = card.querySelector('.comment-button .action-count');
        if (countElement) {
          countElement.textContent = commentCount;
        }

        broadcastPostSync(postId);
      } else {
        alert(data.message || 'Unable to comment.');
      }
      return;
    }

    // FOLLOW AUTHOR
    if (button.dataset.action === 'follow-author') {
      const userId = button.dataset.userId;
      if (!userId) return;

      const { response, data } = await apiPost(`${SOCIAL_API_BASE}/follow/${userId}`, {});

      if (response.ok) {
        // Update button UI
        const isFollowing = data.isFollowing;
        button.classList.toggle('following', isFollowing);
        button.textContent = isFollowing ? 'Following' : 'Follow';

        // Update post object
        post.isFollowingAuthor = isFollowing;
      } else {
        alert(data.message || 'Unable to follow user.');
      }
      return;
    }
  });
}

// Search User Functionality
async function searchUsers(query) {
  if (!query || query.length < 1) {
    renderSearchResults([]);
    return;
  }

  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;

  resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

  try {
    const { response, data } = await apiGet(`${SOCIAL_API_BASE}/search?query=${encodeURIComponent(query)}`);
    
    if (response.ok && data.users) {
      renderSearchResults(data.users);
    } else {
      renderSearchResults([]);
    }
  } catch (error) {
    console.error('Search error:', error);
    renderSearchResults([]);
  }
}

function renderSearchResults(users) {
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;

  if (!users || users.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results"><p>No users found</p></div>';
    return;
  }

  resultsContainer.innerHTML = users.map(user => `
    <div class="user-result-item" data-user-id="${user.userId}">
      <div class="user-avatar">
        ${user.avatar 
          ? `<img src="${user.avatar}" alt="${user.username} avatar">` 
          : `<span class="user-avatar-placeholder">${user.username.charAt(0).toUpperCase()}</span>`
        }
      </div>
      <div class="user-info">
        <span class="user-username">@${user.username}</span>
        <span class="user-fullname">${user.fullName}</span>
      </div>
      <span class="user-result-arrow">→</span>
    </div>
  `).join('');

  // Add click listeners to search results
  document.querySelectorAll('.user-result-item').forEach(item => {
    item.addEventListener('click', function() {
      const userId = this.dataset.userId;
      window.location.href = `user.html?userId=${encodeURIComponent(userId)}`;
    });
  });
}

function initializeSearch() {
  const searchInput = document.getElementById('userSearchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (!searchInput) return;

  // Handle input with debounce
  let searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();

    // Show/hide clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = query ? 'grid' : 'none';
    }

    // Debounce search
    searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  });

  // Clear button handler
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function() {
      searchInput.value = '';
      searchInput.focus();
      this.style.display = 'none';
      renderSearchResults([]);
    });
  }
}

// Initialize search on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}

function initializeCreatePage() {
  const pageName = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
  if (pageName !== 'create') {
    return;
  }

  const cameraOption = document.getElementById('cameraOption');
  const uploadOption = document.getElementById('uploadOption');
  const cameraPanel = document.getElementById('cameraPanel');
  const uploadPanel = document.getElementById('uploadPanel');
  const startCameraButton = document.getElementById('startCameraButton');
  const stopCameraButton = document.getElementById('stopCameraButton');
  const captureButton = document.getElementById('captureButton');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraPreviewCard = document.getElementById('cameraPreviewCard');
  const cameraPreviewTarget = document.getElementById('cameraPreviewTarget');
  const mediaInput = document.getElementById('mediaInput');
  const uploadPreviewCard = document.getElementById('uploadPreviewCard');
  const uploadPreviewTarget = document.getElementById('uploadPreviewTarget');
  const captionInput = document.getElementById('captionInput');
  const postButton = document.getElementById('postButton');
  const createStatus = document.getElementById('createStatus');

  let currentMedia = null;
  let cameraStream = null;

  function updatePreview(target, media) {
    target.innerHTML = '';
    if (!media) {
      return;
    }

    if (media.type === 'video') {
      const video = document.createElement('video');
      video.src = media.src;
      video.controls = true;
      video.className = 'preview-content';
      target.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.src = media.src;
      image.alt = 'Preview';
      image.className = 'preview-content';
      target.appendChild(image);
    }
  }

  function updatePostButtonState() {
    postButton.disabled = !currentMedia;
  }

  function showCreateSection(selected) {
    cameraOption.classList.toggle('active', selected === 'camera');
    uploadOption.classList.toggle('active', selected === 'upload');
    cameraPanel.classList.toggle('hide', selected !== 'camera');
    uploadPanel.classList.toggle('hide', selected !== 'upload');
    createStatus.classList.add('hide');
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera is not supported in this browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(function (stream) {
        cameraStream = stream;
        cameraVideo.srcObject = stream;
        cameraVideo.play();
        captureButton.disabled = false;
        stopCameraButton.classList.remove('hide');
      })
      .catch(function (error) {
        console.error(error);
        alert('Unable to access the camera. Check permissions and try again.');
      });
  }

  function stopCamera() {
    if (!cameraStream) {
      return;
    }

    cameraStream.getTracks().forEach(function (track) {
      track.stop();
    });
    cameraStream = null;
    cameraVideo.srcObject = null;
    captureButton.disabled = true;
    stopCameraButton.classList.add('hide');
  }

  function capturePhoto() {
    if (!cameraStream) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth || 640;
    canvas.height = cameraVideo.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');

    currentMedia = {
      type: 'image',
      src: imageData,
    };

    cameraPreviewCard.classList.remove('hide');
    updatePreview(cameraPreviewTarget, currentMedia);
    updatePostButtonState();
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const acceptedTypes = ['image/', 'video/mp4', 'video/webm'];
    const isValidType = acceptedTypes.some(function (type) {
      return file.type.startsWith(type);
    });

    if (!isValidType) {
      alert('Please choose a valid photo or video file (JPEG, PNG, MP4, WebM).');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      const fileData = loadEvent.target.result;
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      currentMedia = {
        type: mediaType,
        src: fileData,
      };
      uploadPreviewCard.classList.remove('hide');
      updatePreview(uploadPreviewTarget, currentMedia);
      updatePostButtonState();
    };
    reader.readAsDataURL(file);
  }

  function clearCreateForm() {
    captionInput.value = '';
    mediaInput.value = '';
    currentMedia = null;
    cameraPreviewCard.classList.add('hide');
    uploadPreviewCard.classList.add('hide');
    cameraPreviewTarget.innerHTML = '';
    uploadPreviewTarget.innerHTML = '';
    updatePostButtonState();
  }

  async function savePost() {
    if (!currentMedia) {
      return;
    }

    const { response, data } = await apiPost(`${SOCIAL_API_BASE}/posts`, {
      mediaUrl: currentMedia.src,
      mediaType: currentMedia.type,
      caption: captionInput.value.trim(),
    });

    if (!response.ok) {
      alert(data.message || 'Unable to create post.');
      return;
    }

    if (data && data.post && data.post._id) {
      broadcastPostSync(data.post._id.toString());
    }

    localStorage.setItem('activeNavItem', 'home');
    clearCreateForm();
    window.location.href = 'home.html';
  }

  cameraOption.addEventListener('click', function () {
    showCreateSection('camera');
  });

  uploadOption.addEventListener('click', function () {
    showCreateSection('upload');
  });

  startCameraButton.addEventListener('click', startCamera);
  stopCameraButton.addEventListener('click', stopCamera);
  captureButton.addEventListener('click', capturePhoto);
  mediaInput.addEventListener('change', handleFileUpload);
  captionInput.addEventListener('input', function () {
    createStatus.classList.add('hide');
  });
  postButton.addEventListener('click', savePost);

  updatePostButtonState();
}

function isAuthPage() {
  const pathname = window.location.pathname.toLowerCase();
  return pathname.endsWith('/index.html') || pathname.endsWith('/index.htm') || pathname.endsWith('/') || pathname.endsWith('/index');
}

async function autoRedirectIfAuthenticated() {
  if (!isAuthPage()) {
    return;
  }

  const token = getToken();
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (response.ok) {
      window.location.href = 'home.html';
    }
  } catch (error) {
    removeToken();
  }
}

window.addEventListener('DOMContentLoaded', async function () {
  await autoRedirectIfAuthenticated();
  await applyProtectedPage();
  applySidebarState();
  registerPostSyncListeners();
  initializeHomePage();
  initializeCreatePage();
  initializeReelsPage();
  initializeProfilePage();
  initializeUserPage();
});

