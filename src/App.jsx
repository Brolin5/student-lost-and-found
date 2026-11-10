import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  Trash2,
  Edit3,
  X,
  Upload,
  Image as ImageIcon,
  Copy,
  Eye,
  LogOut,
  ArrowRight,
  Check,
  Lock,
  ShieldCheck,
  Activity,
  Layers,
  Laptop,
  FileText,
  Watch,
  Shirt,
  BookOpen,
  Package,
  ChevronDown,
  FileCheck,
  Home,
  Compass,
  Bell,
  Clock,
  Key,
  Wallet,
  Briefcase,
  ScanSearch,
  FileQuestion,
  PackagePlus,
  SlidersHorizontal,
  HelpCircle,
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const RENDER_ORIGIN = 'https://student-lost-and-found.onrender.com';
const isRemoteFrontend =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
   window.location.hostname.includes('netlify.app'));

const API_BASE = isRemoteFrontend ? `${RENDER_ORIGIN}/api` : '/api';
const WS_URL =
  typeof window !== 'undefined'
    ? isRemoteFrontend
      ? 'wss://student-lost-and-found.onrender.com/ws'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : '';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/') && isRemoteFrontend) {
    return `${RENDER_ORIGIN}${url}`;
  }
  return url;
};

const TOUR_STEPS = [
  {
    target: '[data-tour="hero-search"]',
    title: 'Instant Campus Search & Filters',
    description: 'Search by item name, lecture hall, or filter between Lost and Found posts in real time.'
  },
  {
    target: '[data-tour="quick-actions"]',
    title: '1-Tap Quick Actions',
    description: 'Report a lost item, log something you found on campus, or open Smart Matches and Claims with one tap.'
  },
  {
    target: '[data-tour="smart-matches"]',
    title: 'Smart Match Radar',
    description: 'Our similarity engine automatically pairs lost reports with found items using category, keywords, and location.'
  },
  {
    target: '[data-tour="notifications-bell"]',
    title: 'Live WebSocket Notification Tray',
    description: 'Connected via real-time WebSockets to Render — receive instant alerts when matches or claim updates arrive.'
  },
  {
    target: '[data-tour="bottom-dock"]',
    title: 'Tactile Campus Navigation Dock',
    description: 'Switch between Home, Matches, Claims, and Browse, or tap the center + button to post an item from anywhere.'
  }
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('nile_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Vector SVG Nile University Emblem Logo (High-DPI / Crisp)
function NileLogo({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <rect width="44" height="44" rx="10" fill="#1E4FA3" />
      <rect x="0.5" y="0.5" width="43" height="43" rx="9.5" stroke="rgba(255,255,255,0.18)" />
      {/* Sunburst Rays of Academic Knowledge */}
      <path d="M12 11L14.5 15.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 9.5L18.5 14.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 8.5L22 14" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M27 9.5L25.5 14.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 11L29.5 15.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bold Modern NU Lettermark */}
      <text
        x="22"
        y="32"
        textAnchor="middle"
        fontFamily="Montserrat, system-ui, sans-serif"
        fontWeight="900"
        fontSize="17"
        fill="#FFFFFF"
        letterSpacing="-0.5"
      >
        NU
      </text>
    </svg>
  );
}

// Category Definitions with Professional Lucide SVG Icons (Zero emojis)
const CATEGORIES = [
  { value: 'All', label: 'All Categories', icon: Layers },
  { value: 'Electronics', label: 'Electronics', icon: Laptop },
  { value: 'Documents', label: 'Documents & IDs', icon: FileText },
  { value: 'Accessories', label: 'Accessories & Watches', icon: Watch },
  { value: 'Clothing', label: 'Clothing & Apparel', icon: Shirt },
  { value: 'Books', label: 'Books & Notes', icon: BookOpen },
  { value: 'Wallets', label: 'Wallets & Purses', icon: Wallet },
  { value: 'Keys', label: 'Keys & Keycards', icon: Key },
  { value: 'Bags', label: 'Bags & Backpacks', icon: Briefcase },
  { value: 'Other', label: 'Other Property', icon: Package }
];

const STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses', icon: Clock },
  { value: 'Open', label: 'Status: Open', icon: Clock },
  { value: 'Claimed', label: 'Status: Claimed', icon: CheckCircle2 },
  { value: 'Returned', label: 'Status: Returned', icon: CheckCircle2 }
];

const AUDIT_ACTIONS = [
  { value: 'All', label: 'All Actions' },
  { value: 'AUTH_LOGIN', label: 'Sign In Events' },
  { value: 'ITEM_CREATED', label: 'Posts Created' },
  { value: 'STATUS_CHANGED', label: 'Status Updates' },
  { value: 'CLAIM_SUBMITTED', label: 'Claims Filed' },
  { value: 'CLAIM_APPROVED', label: 'Claims Approved' },
  { value: 'ACCESS_DENIED', label: 'Security Blocks' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('nile_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, claimed: 0 });
  const [loading, setLoading] = useState(false);

  // Active Navigation Tab: 'home' | 'browse' | 'matches' | 'claims' | 'audit'
  const [activeTab, setActiveTab] = useState('home');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // All, Lost, Found
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAuditAction, setSelectedAuditAction] = useState('All');
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  // Modals & Confirmation Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [isPostChooserOpen, setIsPostChooserOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  // Real-Time WebSocket & Notification Tray State
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Interactive Product Tour / Step-by-Step Walkthrough State
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourRect, setTourRect] = useState(null);

  // Form states
  const [activeItem, setActiveItem] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Claim Form State
  const [claimVerificationAnswer, setClaimVerificationAnswer] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = getAuthHeaders();
      const isAdmin = currentUser?.role === 'admin';

      const requests = [
        fetch(`${API_BASE}/items`, { headers }),
        fetch(`${API_BASE}/items/stats`, { headers }),
        fetch(`${API_BASE}/claims/my`, { headers }).catch(() => ({ json: () => ({ success: false }) }))
      ];

      // Audit logs only fetched for admins (access control)
      if (isAdmin) {
        requests.push(fetch(`${API_BASE}/audit-logs`, { headers }).catch(() => ({ json: () => ({ success: false }) })));
      }

      const results = await Promise.all(requests);
      const itemsData = await results[0].json();
      const statsData = await results[1].json();
      const claimsData = await results[2].json();

      if (itemsData.success) setItems(itemsData.data || []);
      if (statsData.success) setStats(statsData.data || { total: 0, lost: 0, found: 0, claimed: 0 });
      if (claimsData.success) setClaims(claimsData.data || []);

      if (isAdmin && results[3]) {
        const auditData = await results[3].json();
        if (auditData.success) setAuditLogs(auditData.data || []);
      }
    } catch (err) {
      addToast('Could not load campus data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('nile_auth_token');
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('nile_user', JSON.stringify(data.user));
            loadData();
          } else {
            handleLogout(false);
          }
        })
        .catch(() => loadData());
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
      // Auto-launch step-by-step interactive walkthrough on first login
      const tourDone = localStorage.getItem('nile_tour_completed_v1');
      if (!tourDone) {
        const timer = setTimeout(() => {
          setActiveTab('home');
          setTourStep(0);
          setIsTourOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Keep-Alive Plunger + Real-Time WebSocket Connection to Render Backend
  useEffect(() => {
    // 1. Immediate & periodic Keep-Alive Plunger ping to prevent Render sleep
    const pingBackendPlunger = () => {
      fetch(`${API_BASE}/plunger`).catch(() => {});
    };
    pingBackendPlunger();
    const plungerTimer = setInterval(pingBackendPlunger, 4 * 60 * 1000); // Every 4 minutes

    // 2. WebSocket connection for instant Notification Tray updates
    if (!currentUser || !WS_URL) {
      return () => clearInterval(plungerTimer);
    }

    let ws = null;
    let reconnectTimer = null;
    let pingInterval = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (isUnmounted) return;
          setWsConnected(true);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;

            if (['ITEM_CREATED', 'ITEM_UPDATED', 'ITEM_DELETED', 'CLAIM_SUBMITTED', 'CLAIM_UPDATED'].includes(msg.type)) {
              // Refresh live campus feed & claims silently
              loadData(true);

              const newAlert = {
                id: msg.id || `rt-${Date.now()}`,
                type: msg.type,
                title: msg.data?.title || 'Campus Activity Update',
                message: msg.data?.message || 'New update on the campus board',
                timestamp: msg.timestamp || new Date().toISOString(),
                unread: true
              };

              setRealtimeNotifications(prev => [newAlert, ...prev.slice(0, 14)]);
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setWsConnected(false);
          if (pingInterval) clearInterval(pingInterval);
          reconnectTimer = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (_) {
        reconnectTimer = setTimeout(connectWebSocket, 6000);
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      clearInterval(plungerTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [currentUser]);

  // Interactive Product Tour Spotlight Positioning
  useEffect(() => {
    if (!isTourOpen) {
      setTourRect(null);
      return;
    }

    const stepConfig = TOUR_STEPS[tourStep];
    if (!stepConfig) return;

    const updateSpotlight = () => {
      const el = document.querySelector(stepConfig.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTourRect({
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          bottom: rect.bottom + 6
        });
      } else {
        setTourRect(null);
      }
    };

    const targetEl = document.querySelector(stepConfig.target);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = setTimeout(updateSpotlight, 260);
    updateSpotlight();

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isTourOpen, tourStep, activeTab]);

  const startProductTour = () => {
    setActiveTab('home');
    setIsNotificationsOpen(false);
    setTourStep(0);
    setIsTourOpen(true);
  };

  const closeProductTour = () => {
    setIsTourOpen(false);
    localStorage.setItem('nile_tour_completed_v1', 'true');
  };

  // Click outside & Escape listener for notification popover
  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  // Auth Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login'
        ? { username: authForm.username.trim(), password: authForm.password }
        : { name: authForm.name.trim(), username: authForm.username.trim(), password: authForm.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Sign in failed'));
      }

      localStorage.setItem('nile_auth_token', data.token);
      localStorage.setItem('nile_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setAuthForm({ name: '', username: '', password: '' });
      addToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = (showNotification = true) => {
    localStorage.removeItem('nile_auth_token');
    localStorage.removeItem('nile_user');
    setCurrentUser(null);
    setMyItemsOnly(false);
    setActiveTab('home');
    setIsSignOutConfirmOpen(false);
    if (showNotification) addToast('Signed out of student session', 'info');
  };

  const handleQuickLogin = (username, password) => {
    setAuthForm({ name: '', username, password });
    setAuthMode('login');
  };

  // Create Post
  const handleCreatePost = async (formData, imageFile) => {
    setPostSubmitting(true);
    try {
      let finalImageUrl = formData.image_url || '';

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
        }
      }

      const postBody = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        post_type: formData.post_type,
        category: formData.category,
        location: formData.location.trim(),
        contact_info: formData.contact_info.trim() || `${currentUser.username}@nileuniversity.edu.ng`,
        status: formData.status || 'Open',
        image_url: finalImageUrl
      };

      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(postBody)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Failed to publish post'));
      }

      setIsCreateOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast(`Your ${postBody.post_type} report has been published!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Update Post
  const handleUpdatePost = async (id, formData, imageFile) => {
    setPostSubmitting(true);
    try {
      let finalImageUrl = formData.image_url || '';

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: uploadData
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
        }
      }

      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update post');
      }

      setIsEditOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast('Post updated successfully', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (item, newStatus) => {
    const id = item._id || item.id;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not update status');
      }
      await loadData(true);
      addToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!activeItem) return;
    setPostSubmitting(true);
    const id = activeItem._id || activeItem.id;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete post');
      }

      setIsDeleteOpen(false);
      setActiveItem(null);
      await loadData(true);
      addToast('Post removed permanently', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  // Submit Claim (Privacy Protection)
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    setClaimSubmitting(true);
    try {
      const itemId = activeItem._id || activeItem.id;
      const res = await fetch(`${API_BASE}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          item_id: itemId,
          verification_answer: claimVerificationAnswer.trim(),
          claimant_contact: claimContact.trim() || `${currentUser.username}@nileuniversity.edu.ng`
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit claim');
      }

      setIsClaimModalOpen(false);
      setClaimVerificationAnswer('');
      setClaimContact('');
      setActiveItem(null);
      await loadData(true);
      addToast('Claim request sent! The finder will review your verification answer.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Contact copied', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedType === 'Lost' && item.post_type !== 'Lost') return false;
      if (selectedType === 'Found' && item.post_type !== 'Found') return false;

      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;

      if (myItemsOnly) {
        if (!currentUser) return false;
        const isOwner = currentUser.role === 'admin' ||
          (item.creator_id && item.creator_id === currentUser.id) ||
          (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase());
        if (!isOwner) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        const inLoc = (item.location || '').toLowerCase().includes(q);
        return inTitle || inDesc || inLoc;
      }

      return true;
    });
  }, [items, selectedType, selectedCategory, selectedStatus, myItemsOnly, searchQuery, currentUser]);

  // Smart Matches Pairs Computation
  const smartMatches = useMemo(() => {
    const lostItems = items.filter(i => i.post_type === 'Lost');
    const foundItems = items.filter(i => i.post_type === 'Found');
    const matchesList = [];

    for (const lost of lostItems) {
      for (const found of foundItems) {
        let score = 0;
        if (lost.category && found.category && lost.category.toLowerCase() === found.category.toLowerCase()) {
          score += 40;
        }

        const lTokens = (lost.title + ' ' + lost.description).toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const fTokens = new Set((found.title + ' ' + found.description).toLowerCase().split(/\s+/).filter(w => w.length > 2));
        let matches = 0;
        for (const token of lTokens) {
          if (fTokens.has(token)) matches++;
        }
        if (lTokens.length > 0) {
          score += Math.min(40, matches * 12);
        }

        if (lost.location && found.location && (lost.location.toLowerCase().includes(found.location.toLowerCase()) || found.location.toLowerCase().includes(lost.location.toLowerCase()))) {
          score += 20;
        }

        if (score >= 40) {
          matchesList.push({
            id: `${lost._id || lost.id}-${found._id || found.id}`,
            lost,
            found,
            score: Math.min(100, score)
          });
        }
      }
    }
    return matchesList.sort((a, b) => b.score - a.score);
  }, [items]);

  const unreadRealtimeCount = realtimeNotifications.filter(n => n.unread).length;
  const totalNotificationsCount = smartMatches.length + claims.length + unreadRealtimeCount;
  const isAdmin = currentUser?.role === 'admin';

  // -------------------------------------------------------------------------
  // 1. FORCED LOGIN VIEW (100% Gated Nile University Portal)
  // -------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-nile-dots flex flex-col justify-between text-[#1F2328] relative font-sans">
        {/* Top Nile Blue Accent Strip */}
        <div className="h-1.5 w-full bg-[#1E4FA3]"></div>

        <div className="p-4 sm:p-6 flex flex-col flex-1 justify-center max-w-sm sm:max-w-md mx-auto w-full my-auto animate-motion-blur-dialog">
          {/* Soft Embossed Logo Squircle (TikTok Style 04) */}
          <div className="w-20 h-20 rounded-3xl soft-logo-squircle border border-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <NileLogo size={46} />
          </div>

          {/* Heading Hierarchy matching TikTok Style */}
          <div className="text-center mb-6">
            <h1 className="font-heading font-extrabold text-2xl text-[#16397A] tracking-tight">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">
              {authMode === 'login'
                ? 'Login to continue to your Nile portal'
                : 'Register your verified student credentials'}
            </p>
          </div>

          {/* Soft Embossed Card Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 soft-embossed-card space-y-5">
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl soft-input-pill">
                  <User className="w-4 h-4 text-[#1E4FA3] shrink-0" />
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    placeholder="Full Student Name"
                    className="w-full bg-transparent text-xs text-[#1F2328] placeholder-[#94A3B8] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl soft-input-pill">
                <User className="w-4 h-4 text-[#1E4FA3] shrink-0" />
                <input
                  type="text"
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  placeholder="Student Username or ID"
                  className="w-full bg-transparent text-xs text-[#1F2328] placeholder-[#94A3B8] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl soft-input-pill">
                <Lock className="w-4 h-4 text-[#1E4FA3] shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Password"
                  className="w-full bg-transparent text-xs text-[#1F2328] placeholder-[#94A3B8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#94A3B8] hover:text-[#1E4FA3] p-1 transition-colors btn-spring cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 text-[#1E4FA3]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#94A3B8]" />
                  )}
                </button>
              </div>

              {/* Forgot Password link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => addToast('Contact Nile IT Helpdesk at support@nileuniversity.edu.ng for credentials reset.', 'info')}
                  className="text-[11px] font-semibold text-[#1E4FA3] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Tactile Pill Button */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-2xl text-white font-heading font-extrabold text-sm tracking-wide btn-nile-pill btn-spring flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{authSubmitting ? 'Verifying...' : authMode === 'login' ? 'Login' : 'Sign Up'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Clean Flex Divider (Zero white box cutout artifact) */}
            <div className="pt-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]"></div>
                <span className="text-[11px] font-semibold text-[#64748B]">
                  Quick Demo Access
                </span>
                <div className="h-px flex-1 bg-[#E2E8F0]"></div>
              </div>

              {/* Uniform Tactile Quick-Login Pills */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('tunde', 'password123')}
                  className="py-2.5 px-2 rounded-xl soft-quick-btn text-xs font-bold text-[#1E4FA3] flex items-center justify-center gap-1.5 btn-spring cursor-pointer"
                  title="Login as student Tunde"
                >
                  <User className="w-3.5 h-3.5 text-[#1E4FA3]" />
                  <span>@tunde</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('chioma', 'password123')}
                  className="py-2.5 px-2 rounded-xl soft-quick-btn text-xs font-bold text-[#1E4FA3] flex items-center justify-center gap-1.5 btn-spring cursor-pointer"
                  title="Login as student Chioma"
                >
                  <User className="w-3.5 h-3.5 text-[#1E4FA3]" />
                  <span>@chioma</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="py-2.5 px-2 rounded-xl soft-quick-btn text-xs font-bold text-[#16397A] flex items-center justify-center gap-1.5 btn-spring cursor-pointer"
                  title="Login as Administrator"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E4FA3]" />
                  <span>@admin</span>
                </button>
              </div>
            </div>

            {/* Toggle Mode Link (Sign Up / Sign In) */}
            <div className="pt-1 text-center text-xs text-[#6B7280]">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="font-bold text-[#1E4FA3] hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-bold text-[#1E4FA3] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="text-center pt-4 pb-2 text-[11px] text-[#94A3B8]">
            Nile University of Nigeria • Student Portal
          </div>
        </div>

        {/* Toasts (Strictly Blue & White Theme) */}
        <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold toast-slide-in border ${
                toast.type === 'success'
                  ? 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
                  : toast.type === 'error'
                  ? 'bg-white text-[#F25C54] border-[#F25C54]/30'
                  : 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#F25C54]" />}
              {toast.type === 'info' && <Check className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATED MOBILE-FIRST UI (Professional Affordance & Nile Theme)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-[#1F2328] pb-28 font-sans relative selection:bg-[#EEF2F9] selection:text-[#1E4FA3]">
      {/* Top Nile Blue Accent Strip */}
      <div className="h-1.5 w-full bg-[#1E4FA3]"></div>

      {/* ---------------------------------------------------- */}
      {/* 2.1 Sticky Top App Bar (56px) */}
      {/* ---------------------------------------------------- */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#E5E9F2] sticky top-0 z-40 h-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Logo & Brand with Crisp Vector SVG Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <NileLogo size={34} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-heading font-extrabold text-xs sm:text-sm text-[#1E4FA3] tracking-tight">
                  NILE
                </span>
                <span className="font-heading font-extrabold text-xs sm:text-sm text-[#1F2328] tracking-tight">
                  UNIVERSITY
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block leading-none">
                CAMPUS LOST & FOUND
              </span>
            </div>
          </div>

          {/* Right Header: Guided Tour, Notification Tray, Session Pill, and Sign Out */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Step-by-Step Interactive Walkthrough / Tour Trigger */}
            <button
              onClick={startProductTour}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#EEF2F9] hover:bg-[#DBEAFE] text-[#1E4FA3] text-[11px] font-bold transition-colors btn-spring cursor-pointer border border-[#DBEAFE]"
              title="Start Step-by-Step Guided Tour"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Guide</span>
            </button>

            {/* Notification Tray Bell with Real-Time WebSockets */}
            <div className="relative" ref={notificationsRef} data-tour="notifications-bell">
              <button
                onClick={() => {
                  setIsNotificationsOpen(prev => !prev);
                  setRealtimeNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                }}
                className={`relative p-2 rounded-full transition-colors btn-spring cursor-pointer ${
                  isNotificationsOpen
                    ? 'bg-[#1E4FA3] text-white shadow-xs'
                    : 'hover:bg-[#EEF2F9] text-[#6B7280] hover:text-[#1E4FA3]'
                }`}
                title="Live Notification Tray"
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-4 h-4" />
                {totalNotificationsCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono tabular-nums font-bold flex items-center justify-center ${
                    isNotificationsOpen
                      ? 'bg-white text-[#1E4FA3]'
                      : 'bg-[#1E4FA3] text-white ring-2 ring-white'
                  }`}>
                    {totalNotificationsCount > 9 ? '9+' : totalNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Tray Flyout */}
              {isNotificationsOpen && (
                <div
                  className="fixed inset-x-4 top-16 mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm bg-white rounded-2xl shadow-xl border border-[#DBEAFE] z-50 p-4 animate-dropdown-in origin-top-right overflow-hidden"
                  role="dialog"
                  aria-label="Notification Tray"
                >
                  {/* Tray Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E9F2]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#EEF2F9] flex items-center justify-center text-[#1E4FA3]">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-heading font-bold text-sm text-[#1F2328] leading-tight">
                            Notification Tray
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EEF2F9] text-[#1E4FA3] border border-[#DBEAFE]">
                            <Radio className="w-2.5 h-2.5" />
                            {wsConnected ? 'Live' : 'Sync'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#6B7280]">
                          Real-time WebSocket radar & claims
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {realtimeNotifications.length > 0 && (
                        <button
                          onClick={() => setRealtimeNotifications([])}
                          className="text-[10px] font-semibold text-[#1E4FA3] hover:underline px-1.5 py-0.5 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1 rounded-md text-[#6B7280] hover:text-[#1F2328] hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close notification tray"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tray Body */}
                  {totalNotificationsCount === 0 && realtimeNotifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <div className="w-11 h-11 rounded-full bg-[#F8FAFC] border border-[#E5E9F2] mx-auto flex items-center justify-center text-[#1E4FA3] mb-2.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h4 className="font-heading font-bold text-sm text-[#1F2328]">
                        All Caught Up!
                      </h4>
                      <p className="text-xs text-[#6B7280] mt-1 max-w-[240px] mx-auto">
                        Live WebSocket radar is listening. Instant alerts will appear here the moment a match is reported.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[340px] overflow-y-auto py-2 space-y-3.5 pr-1 divide-y divide-[#F1F5F9]">
                      {/* Section 0: Real-Time WebSocket Broadcast Stream */}
                      {realtimeNotifications.length > 0 && (
                        <div className="space-y-2 pt-1 first:pt-0">
                          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                            <span className="flex items-center gap-1.5 text-[#1E4FA3]">
                              <Radio className="w-3.5 h-3.5" />
                              Live Campus Stream ({realtimeNotifications.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {realtimeNotifications.slice(0, 4).map((evt) => (
                              <div
                                key={evt.id}
                                onClick={() => {
                                  if (evt.type.startsWith('CLAIM')) {
                                    setActiveTab('claims');
                                  } else {
                                    setActiveTab('home');
                                  }
                                  setIsNotificationsOpen(false);
                                }}
                                className="p-2.5 rounded-xl bg-[#EEF2F9]/60 hover:bg-[#EEF2F9] border border-[#DBEAFE] transition-all cursor-pointer group btn-spring"
                              >
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-wide">
                                    {evt.title}
                                  </span>
                                  <span className="text-[9px] font-mono tabular-nums text-[#64748B]">
                                    Just now
                                  </span>
                                </div>
                                <p className="text-xs text-[#1F2328] line-clamp-2">
                                  {evt.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 1: Smart Match Alerts */}
                      {smartMatches.length > 0 && (
                        <div className="space-y-2 pt-2 first:pt-0">
                          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                            <span className="flex items-center gap-1.5 text-[#1E4FA3]">
                              <ScanSearch className="w-3.5 h-3.5" />
                              Smart Matches ({smartMatches.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {smartMatches.slice(0, 3).map((match) => (
                              <div
                                key={match.id}
                                onClick={() => {
                                  setActiveTab('matches');
                                  setIsNotificationsOpen(false);
                                }}
                                className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EEF2F9] border border-[#E5E9F2] hover:border-[#CBD5E1] transition-all cursor-pointer group btn-spring"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-wide">
                                    Radar Match
                                  </span>
                                  <span className="text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.2 rounded-full bg-blue-100/90 text-[#1E4FA3]">
                                    {match.score}% score
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-[#1F2328] group-hover:text-[#1E4FA3] transition-colors line-clamp-1">
                                  Found "{match.found.title}" matches your "{match.lost.title}"
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B7280]">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#1E4FA3]" />
                                    {match.found.location}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Claim Status Updates */}
                      {claims.length > 0 && (
                        <div className="space-y-2 pt-3 first:pt-0">
                          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                            <span className="flex items-center gap-1.5 text-[#1E4FA3]">
                              <FileCheck className="w-3.5 h-3.5" />
                              Your Claims ({claims.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {claims.slice(0, 3).map((claim) => (
                              <div
                                key={claim.id}
                                onClick={() => {
                                  setActiveTab('claims');
                                  setIsNotificationsOpen(false);
                                }}
                                className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EEF2F9] border border-[#E5E9F2] hover:border-[#CBD5E1] transition-all cursor-pointer group btn-spring"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">
                                    Claim #{claim.id}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      claim.status === 'Approved'
                                        ? 'bg-blue-100 text-[#1E4FA3]'
                                        : claim.status === 'Rejected'
                                        ? 'bg-rose-100 text-[#F25C54]'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {claim.status}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-[#1F2328] group-hover:text-[#1E4FA3] transition-colors line-clamp-1">
                                  {claim.item_title}
                                </p>
                                <p className="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5">
                                  {claim.status === 'Approved'
                                    ? 'Claim approved! Tap to view finder contact.'
                                    : claim.status === 'Rejected'
                                    ? 'Claim not approved by poster.'
                                    : 'Awaiting finder review on campus.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flyout Footer Navigation Buttons */}
                  <div className="pt-3 border-t border-[#E5E9F2] grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => {
                        setActiveTab('matches');
                        setIsNotificationsOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-[#1E4FA3] bg-[#EEF2F9] hover:bg-blue-100 rounded-xl transition-colors text-center btn-spring flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ScanSearch className="w-3.5 h-3.5" />
                      <span>Matches ({smartMatches.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('claims');
                        setIsNotificationsOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#1F2328] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center btn-spring flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Claims ({claims.length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clean Student Pill (No green stuff!) */}
            <div className="hidden sm:flex items-center gap-2 bg-[#EEF2F9] rounded-full px-3 py-1 border border-[#E5E9F2]">
              <span className="text-[11px] font-bold text-[#1E4FA3] tabular-nums">
                @{currentUser.username}
              </span>
              <span className="text-[9px] uppercase font-bold text-[#6B7280] bg-white px-2 py-0.5 rounded-full border border-[#E5E9F2] shadow-2xs">
                {currentUser.role}
              </span>
            </div>

            {/* Sign Out with Confirmation Modal Trigger */}
            <button
              onClick={() => setIsSignOutConfirmOpen(true)}
              className="p-2 rounded-full hover:bg-rose-50 text-[#6B7280] hover:text-[#F25C54] transition-colors btn-spring cursor-pointer"
              title="Sign out of student session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2.2 Main View Switcher based on Active Tab */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'home' || activeTab === 'browse') && (
        <div>
          {/* MARCELO DESIGN X DARK HERO GRADIENT */}
          <section className="hero-nile-gradient text-white pt-8 pb-14 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Greeting & Main Headline Stat */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white/80 block">
                    Welcome back, {currentUser.name?.split(' ')[0]}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white mt-1">
                    {stats.claimed + 128} Items Reunited
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-widest text-white/70 block">
                    ACTIVE REPORTS
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {stats.total}
                  </span>
                </div>
              </div>

              {/* Large Rounded Search Bar & Filter Pills */}
              <div className="space-y-3" data-tour="hero-search">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search: Casio calculator, student ID, keys, laptop..."
                    className="w-full bg-white text-[#1F2328] placeholder-[#6B7280] rounded-2xl pl-11 pr-10 py-3.5 text-xs font-medium focus:outline-none shadow-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Segmented Filter Pills (All | Lost | Found) */}
                <div className="flex items-center gap-2">
                  {['All', 'Lost', 'Found'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all btn-spring cursor-pointer ${
                        selectedType === type
                          ? 'bg-white text-[#1E4FA3] shadow-sm'
                          : 'bg-white/15 text-white/90 border border-white/20 hover:bg-white/25'
                      }`}
                    >
                      {type === 'All' ? 'All Items' : type}
                    </button>
                  ))}

                  <button
                    onClick={() => setMyItemsOnly(prev => !prev)}
                    className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold transition-all btn-spring cursor-pointer ${
                      myItemsOnly
                        ? 'bg-white text-[#1E4FA3] shadow-sm font-bold'
                        : 'bg-white/15 text-white/90 border border-white/20'
                    }`}
                  >
                    {myItemsOnly ? 'My Posts Only' : 'My Posts'}
                  </button>
                </div>
              </div>

              {/* FOUR PROFESSIONAL CLICKABLE ACTION BUTTON CARDS */}
              {/* Designed with tactile card borders, hover lift, inner icon squircle tile & clear clickability */}
              <div className="grid grid-cols-4 gap-3 pt-2" data-tour="quick-actions">
                {/* 1. Report Lost Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                    setIsCreateOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/12 hover:bg-white/20 active:scale-[0.96] border border-white/25 backdrop-blur-md transition-all btn-spring shadow-xs group cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center text-white mb-1.5 transition-colors shadow-inner">
                    <FileQuestion className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-heading font-bold text-white tracking-wide text-center leading-tight">
                    Report Lost
                  </span>
                </button>

                {/* 2. Report Found Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem({ post_type: 'Found', category: 'Electronics', status: 'Open' });
                    setIsCreateOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/12 hover:bg-white/20 active:scale-[0.96] border border-white/25 backdrop-blur-md transition-all btn-spring shadow-xs group cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center text-white mb-1.5 transition-colors shadow-inner">
                    <PackagePlus className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-heading font-bold text-white tracking-wide text-center leading-tight">
                    Report Found
                  </span>
                </button>

                {/* 3. Smart Match Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('matches')}
                  className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/12 hover:bg-white/20 active:scale-[0.96] border border-white/25 backdrop-blur-md transition-all btn-spring shadow-xs group cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center text-white mb-1.5 transition-colors shadow-inner">
                    <ScanSearch className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-heading font-bold text-white tracking-wide text-center leading-tight">
                    Smart Match
                  </span>
                </button>

                {/* 4. Action Button: My Claims for Students / Admin Audit for Admin */}
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/12 hover:bg-white/20 active:scale-[0.96] border border-white/25 backdrop-blur-md transition-all btn-spring shadow-xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center text-white mb-1.5 transition-colors shadow-inner">
                      <ShieldCheck className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-heading font-bold text-white tracking-wide text-center leading-tight">
                      Admin Audit
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('claims')}
                    className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/12 hover:bg-white/20 active:scale-[0.96] border border-white/25 backdrop-blur-md transition-all btn-spring shadow-xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center text-white mb-1.5 transition-colors shadow-inner">
                      <FileCheck className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-heading font-bold text-white tracking-wide text-center leading-tight">
                      My Claims
                    </span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* WHITE SHEET OVERLAPPING THE HERO (28px radius, zero bottom shadow bleed) */}
          <section id="campus-directory-section" className="-mt-6 bg-white sheet-overlap-top border-t border-[#E5E9F2] px-4 sm:px-6 pt-6 pb-8 max-w-5xl mx-auto">
            {/* Quick Category Chips with Lucide Icons (Zero emojis) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
              {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all btn-spring cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E4FA3] text-white shadow-sm'
                        : 'bg-[#EEF2F9] text-[#1F2328] hover:bg-slate-200/80 border border-[#E5E9F2]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Smart Match Banner with Professional ScanSearch Icon (Zero Sparkles) */}
            {smartMatches.length > 0 && (
              <div
                data-tour="smart-matches"
                onClick={() => setActiveTab('matches')}
                className="mb-6 p-4 rounded-2xl bg-[#EEF2F9] border border-[#1E4FA3]/20 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#E5EDFB] transition-colors btn-spring"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E4FA3] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ScanSearch className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="font-heading font-extrabold text-xs text-[#1E4FA3] block">
                      Smart Match Radar Found {smartMatches.length} Possible Matches!
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      Review intelligent matches between lost and found items.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#1E4FA3] shrink-0">
                  <span>Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Feed Header with Custom Status Dropdown */}
            <div className="flex items-center justify-between mb-4" {...(smartMatches.length === 0 ? { 'data-tour': 'smart-matches' } : {})}>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#1F2328] tracking-tight">
                  Recently Posted Items
                </h3>
                <span className="text-xs text-[#6B7280]">
                  Showing <strong className="text-[#1F2328] tabular-nums">{filteredItems.length}</strong> campus items
                </span>
              </div>

              {/* Custom Status Dropdown (Zero native select) */}
              <div className="w-40">
                <CustomSelect
                  value={selectedStatus}
                  onChange={(val) => setSelectedStatus(val)}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            {/* Item Cards Feed */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white rounded-2xl border border-[#E5E9F2] p-4 space-y-3 shadow-xs">
                    <div className="h-44 rounded-xl skeleton-shimmer"></div>
                    <div className="h-4 w-3/4 rounded-md skeleton-shimmer"></div>
                    <div className="h-3 w-1/2 rounded-md skeleton-shimmer"></div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E9F2] p-12 text-center space-y-3 my-6 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#EEF2F9] text-[#1E4FA3] flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-heading font-bold text-[#1F2328]">No matching property found</p>
                <p className="text-xs text-[#6B7280]">Try adjusting your search keywords or resetting filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('All');
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                    setMyItemsOnly(false);
                  }}
                  className="text-xs font-bold text-[#1E4FA3] hover:underline btn-spring"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredItems.map((item, idx) => {
                  const id = item._id || item.id;
                  const isOwner = currentUser && (
                    currentUser.role === 'admin' ||
                    (item.creator_id && item.creator_id === currentUser.id) ||
                    (item.creator_username && item.creator_username.toLowerCase() === currentUser.username.toLowerCase())
                  );
                  const isLost = item.post_type === 'Lost';
                  const catObj = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[1];
                  const CatIcon = catObj.icon;

                  return (
                    <div
                      key={id}
                      style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
                      className="stagger-item bg-white rounded-2xl border border-[#E5E9F2] hover:border-[#CBD5E1] card-hover-spring flex flex-col justify-between overflow-hidden shadow-nile-card"
                    >
                      <div>
                        {/* 4:3 Photo Area */}
                        <div className="relative w-full h-44 bg-[#F8FAFC] overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={resolveImageUrl(item.image_url)}
                              alt={item.title}
                              onClick={() => setLightboxImage({ url: resolveImageUrl(item.image_url), title: item.title })}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              onClick={() => {
                                if (isOwner) {
                                  setActiveItem(item);
                                  setIsEditOpen(true);
                                }
                              }}
                              className="w-full h-full flex flex-col items-center justify-center text-[#6B7280] p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <CatIcon className="w-8 h-8 text-[#CBD5E1] mb-1" />
                              <span className="text-[11px] text-[#6B7280]">
                                {isOwner ? 'Add real photo' : 'No photo uploaded'}
                              </span>
                            </div>
                          )}

                          {/* Top-Left Pill Badge: Lost (Deep Navy) / Found (Nile Blue) */}
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wide text-white shadow-xs ${
                                isLost ? 'bg-[#16397A]' : 'bg-[#1E4FA3]'
                              }`}
                            >
                              {item.post_type}
                            </span>
                          </div>

                          {/* Top-Right Status Chip */}
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#1F2328] border border-[#E5E9F2] shadow-xs">
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {/* Card Body with 3-Level Text Hierarchy */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#6B7280] font-medium">
                            <div className="flex items-center gap-1 text-[#1E4FA3] font-semibold">
                              <CatIcon className="w-3.5 h-3.5" />
                              <span>{item.category}</span>
                            </div>
                            <span className="tabular-nums font-mono text-[11px]">
                              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h4 className="font-heading font-bold text-sm text-[#1F2328] leading-snug line-clamp-1">
                            {item.title}
                          </h4>

                          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                            <MapPin className="w-3.5 h-3.5 text-[#F25C54] shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>

                          <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Contact or Claim Button */}
                          <div className="pt-2">
                            {isOwner ? (
                              <div className="bg-[#EEF2F9] border border-[#E5E9F2] rounded-xl p-2 flex items-center justify-between text-xs text-[#1E4FA3] font-medium">
                                <span className="truncate">Your post ({item.status})</span>
                                <button
                                  onClick={() => handleCopy(id, item.contact_info)}
                                  className="text-[#6B7280] hover:text-[#1F2328] p-1 btn-spring"
                                  title="Copy contact"
                                >
                                  {copiedId === id ? (
                                    <span className="animate-crossfade inline-flex"><Check className="w-3.5 h-3.5 text-[#1E4FA3]" /></span>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveItem(item);
                                  setIsClaimModalOpen(true);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold flex items-center justify-center gap-1.5 btn-spring shadow-xs"
                              >
                                <span>{isLost ? 'I Found This →' : 'This Is Mine (Claim) →'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Owner Controls with Custom Dropdown */}
                      {isOwner && (
                        <div className="p-3 bg-[#F8FAFC] border-t border-[#E5E9F2] flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <CustomSelect
                              value={item.status}
                              onChange={(val) => handleQuickStatusChange(item, val)}
                              options={[
                                { value: 'Open', label: 'Open', icon: Clock },
                                { value: 'Claimed', label: 'Claimed', icon: CheckCircle2 },
                                { value: 'Returned', label: 'Returned', icon: CheckCircle2 }
                              ]}
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-[#6B7280] transition-colors btn-spring"
                              title="Edit post"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveItem(item);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-[#F25C54] transition-colors btn-spring"
                              title="Delete post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.3 SMART MATCH RADAR TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'matches' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-widest block">
                INTELLIGENT REUNION ENGINE
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                Smart Match Radar
              </h2>
            </div>
            <div className="bg-[#EEF2F9] rounded-full px-3 py-1 text-xs font-bold text-[#1E4FA3]">
              {smartMatches.length} Matches Found
            </div>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed">
            Our campus algorithm continuously pairs Lost and Found reports based on category taxonomy, keyword token overlap, and campus location proximity.
          </p>

          {smartMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E9F2] p-10 text-center space-y-2">
              <ScanSearch className="w-10 h-10 text-[#6B7280] mx-auto" strokeWidth={1.5} />
              <p className="text-sm font-heading font-bold text-[#1F2328]">No high-confidence matches yet</p>
              <p className="text-xs text-[#6B7280]">As more lost and found items are logged, matching pairs will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {smartMatches.map(m => (
                <div key={m.id} className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-nile-card space-y-4 card-hover-spring">
                  {/* Match Confidence Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-extrabold text-[#1E4FA3]">
                      {m.score}% Similarity Match
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF2F9] text-[#1E4FA3]">
                      Category: {m.lost.category}
                    </span>
                  </div>

                  {/* Two Column Comparison: Lost Item <-> Found Item */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F25C54] text-white">
                        Lost Item
                      </span>
                      <h4 className="font-heading font-bold text-xs text-[#1F2328]">{m.lost.title}</h4>
                      <p className="text-[11px] text-[#6B7280] line-clamp-2">{m.lost.description}</p>
                      <div className="text-[10px] text-[#6B7280] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#F25C54]" />
                        <span>{m.lost.location}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E4FA3] text-white">
                        Found Item
                      </span>
                      <h4 className="font-heading font-bold text-xs text-[#1F2328]">{m.found.title}</h4>
                      <p className="text-[11px] text-[#6B7280] line-clamp-2">{m.found.description}</p>
                      <div className="text-[10px] text-[#6B7280] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1E4FA3]" />
                        <span>{m.found.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveItem(m.found);
                        setIsClaimModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-bold btn-spring shadow-xs"
                    >
                      Connect & Claim Property →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.4 AUDIT TRAIL / SECURITY LOG TAB (Admins Only!) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          {!isAdmin ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-[#F25C54] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-extrabold text-base text-[#1F2328]">Access Restricted</h3>
              <p className="text-xs text-[#6B7280]">Campus security audit trails are restricted to university administrators only.</p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-[#1E4FA3] text-white text-xs font-bold btn-spring"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-widest block">
                    ADMINISTRATIVE COMPLIANCE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                    Campus Security Audit Trail
                  </h2>
                </div>

                <div className="w-48">
                  <CustomSelect
                    value={selectedAuditAction}
                    onChange={(val) => setSelectedAuditAction(val)}
                    options={AUDIT_ACTIONS}
                  />
                </div>
              </div>

              <p className="text-xs text-[#6B7280]">
                Tamper-evident system log tracking student authentications, item publications, verification claims, and permission enforcement.
              </p>

              <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-nile-card overflow-hidden">
                <div className="p-4 bg-[#EEF2F9] border-b border-[#E5E9F2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E4FA3]">Administrative Activity Trail</span>
                  <span className="text-xs text-[#6B7280] font-mono tabular-nums">
                    {auditLogs.length} events recorded
                  </span>
                </div>

                <div className="divide-y divide-[#E5E9F2] max-h-[600px] overflow-y-auto">
                  {auditLogs
                    .filter(l => selectedAuditAction === 'All' || l.action === selectedAuditAction)
                    .map(log => {
                      const isDenied = log.action === 'ACCESS_DENIED';
                      const isCreated = log.action === 'ITEM_CREATED';
                      const isClaim = log.action.includes('CLAIM');

                      return (
                        <div key={log.id} className="p-4 hover:bg-[#F8FAFC] transition-colors flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                  isDenied
                                    ? 'bg-rose-100 text-[#F25C54]'
                                    : isCreated
                                    ? 'bg-blue-100 text-[#1E4FA3]'
                                    : isClaim
                                    ? 'bg-blue-100 text-[#1E4FA3]'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {log.action}
                              </span>
                              <span className="font-bold text-[#1F2328]">@{log.actor_username}</span>
                              <span className="text-[10px] text-[#6B7280]">({log.actor_role})</span>
                            </div>
                            <p className="text-[#1F2328] font-medium leading-relaxed">
                              {log.details}
                            </p>
                            <span className="text-[10px] text-[#6B7280] font-mono">
                              Client IP: {log.ip_address}
                            </span>
                          </div>

                          <div className="text-right text-[11px] font-mono tabular-nums text-[#6B7280] shrink-0">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.5 CLAIMS / INQUIRIES TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'claims' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-motion-blur">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-widest block">
                VERIFICATION DESK
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#1E4FA3] tracking-tight">
                My Property Claims
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#6B7280]">
            Track claims you have filed to reclaim lost belongings, and view their review status.
          </p>

          {claims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E9F2] p-10 text-center space-y-2">
              <FileCheck className="w-10 h-10 text-[#6B7280] mx-auto" />
              <p className="text-sm font-heading font-bold text-[#1F2328]">No active claims filed</p>
              <p className="text-xs text-[#6B7280]">When you find an item that belongs to you and click "This Is Mine", your claim will show here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map(claim => (
                <div key={claim.id} className="bg-white rounded-2xl border border-[#E5E9F2] p-4 shadow-nile-card flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">
                      CLAIM ID: {claim.id}
                    </span>
                    <h4 className="font-heading font-bold text-sm text-[#1E4FA3]">
                      {claim.item_title}
                    </h4>
                    <p className="text-xs text-[#6B7280] line-clamp-1">
                      Your answer: "{claim.verification_answer}"
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      claim.status === 'Approved'
                        ? 'bg-blue-100 text-[#1E4FA3]'
                        : claim.status === 'Rejected'
                        ? 'bg-rose-100 text-[#F25C54]'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.6 TACTILE FLOATING PILL BOTTOM NAVIGATION DOCK     */}
      {/* ---------------------------------------------------- */}
      <nav
        data-tour="bottom-dock"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-[430px] bg-white/95 backdrop-blur-xl border border-[#BFDBFE] ring-4 ring-[#EEF2F9]/80 rounded-full p-1.5 floating-pill-nav flex items-center justify-between gap-1"
      >
        {/* Tab 1: Home */}
        <button
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 py-2 px-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all btn-spring cursor-pointer relative ${
            activeTab === 'home'
              ? 'bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] shadow-2xs'
              : 'text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#F8FAFC] border border-transparent'
          }`}
        >
          <Home className="w-4 h-4" strokeWidth={activeTab === 'home' ? 2.4 : 1.9} />
          <span className={`text-[10px] tracking-wide leading-none mt-0.5 ${activeTab === 'home' ? 'font-heading font-extrabold' : 'font-semibold'}`}>
            Home
          </span>
          {activeTab === 'home' && (
            <span className="w-3.5 h-0.5 rounded-full bg-[#1E4FA3] mt-0.5"></span>
          )}
        </button>

        {/* Tab 2: Smart Matches */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-2 px-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all btn-spring cursor-pointer relative ${
            activeTab === 'matches'
              ? 'bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] shadow-2xs'
              : 'text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#F8FAFC] border border-transparent'
          }`}
        >
          <div className="relative">
            <ScanSearch className="w-4 h-4" strokeWidth={activeTab === 'matches' ? 2.4 : 1.9} />
            {smartMatches.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#1E4FA3] text-white text-[8px] font-mono tabular-nums font-bold flex items-center justify-center ring-2 ring-white">
                {smartMatches.length}
              </span>
            )}
          </div>
          <span className={`text-[10px] tracking-wide leading-none mt-0.5 ${activeTab === 'matches' ? 'font-heading font-extrabold' : 'font-semibold'}`}>
            Matches
          </span>
          {activeTab === 'matches' && (
            <span className="w-3.5 h-0.5 rounded-full bg-[#1E4FA3] mt-0.5"></span>
          )}
        </button>

        {/* CENTER SCULPTED + POST ACTION CRADLE */}
        <div className="p-1 -my-4 bg-white rounded-full border border-[#BFDBFE] shadow-md shrink-0 mx-0.5">
          <button
            onClick={() => setIsPostChooserOpen(true)}
            className="w-11 h-11 rounded-full btn-nile-pill text-white flex items-center justify-center btn-spring cursor-pointer group"
            title="Report Lost or Found Item"
          >
            <Plus className="w-5 h-5 stroke-[2.6] group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Tab 4: Claims */}
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex-1 py-2 px-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all btn-spring cursor-pointer relative ${
            activeTab === 'claims'
              ? 'bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] shadow-2xs'
              : 'text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#F8FAFC] border border-transparent'
          }`}
        >
          <div className="relative">
            <FileCheck className="w-4 h-4" strokeWidth={activeTab === 'claims' ? 2.4 : 1.9} />
            {claims.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#DBEAFE] text-[#1E4FA3] text-[8px] font-mono tabular-nums font-bold flex items-center justify-center ring-2 ring-white">
                {claims.length}
              </span>
            )}
          </div>
          <span className={`text-[10px] tracking-wide leading-none mt-0.5 ${activeTab === 'claims' ? 'font-heading font-extrabold' : 'font-semibold'}`}>
            Claims
          </span>
          {activeTab === 'claims' && (
            <span className="w-3.5 h-0.5 rounded-full bg-[#1E4FA3] mt-0.5"></span>
          )}
        </button>

        {/* Tab 5: Audit (Admins Only) / Browse (Students) */}
        {isAdmin ? (
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2 px-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all btn-spring cursor-pointer relative ${
              activeTab === 'audit'
                ? 'bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#F8FAFC] border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" strokeWidth={activeTab === 'audit' ? 2.4 : 1.9} />
            <span className={`text-[10px] tracking-wide leading-none mt-0.5 ${activeTab === 'audit' ? 'font-heading font-extrabold' : 'font-semibold'}`}>
              Audit
            </span>
            {activeTab === 'audit' && (
              <span className="w-3.5 h-0.5 rounded-full bg-[#1E4FA3] mt-0.5"></span>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setActiveTab('browse');
              const el = document.getElementById('campus-directory-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`flex-1 py-2 px-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all btn-spring cursor-pointer relative ${
              activeTab === 'browse'
                ? 'bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#F8FAFC] border border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={activeTab === 'browse' ? 2.4 : 1.9} />
            <span className={`text-[10px] tracking-wide leading-none mt-0.5 ${activeTab === 'browse' ? 'font-heading font-extrabold' : 'font-semibold'}`}>
              Browse
            </span>
            {activeTab === 'browse' && (
              <span className="w-3.5 h-0.5 rounded-full bg-[#1E4FA3] mt-0.5"></span>
            )}
          </button>
        )}
      </nav>

      {/* ---------------------------------------------------- */}
      {/* 2.7 SIGN OUT CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      {isSignOutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5E9F2] p-6 text-center space-y-4 shadow-2xl animate-motion-blur-dialog">
            <div className="w-12 h-12 rounded-full bg-[#EEF2F9] text-[#1E4FA3] flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">Sign Out of Session?</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Are you sure you want to end your active session as <strong>@{currentUser.username}</strong> on the Nile Lost & Found registry?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsSignOutConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogout(true)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold btn-spring"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.8 POST TYPE CHOOSER BOTTOM SHEET */}
      {/* ---------------------------------------------------- */}
      {isPostChooserOpen && (
        <div
          onClick={() => setIsPostChooserOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white border border-[#E5E9F2] p-6 space-y-4 shadow-2xl animate-motion-blur-dialog"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">What happened?</h3>
              <button onClick={() => setIsPostChooserOpen(false)} className="text-[#6B7280] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsPostChooserOpen(false);
                  setActiveItem({ post_type: 'Lost', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="p-4 rounded-2xl bg-[#16397A] text-white flex flex-col items-center justify-center gap-2 btn-spring shadow-sm cursor-pointer"
              >
                <FileQuestion className="w-6 h-6" />
                <span className="font-heading font-extrabold text-xs uppercase tracking-wide">
                  I Lost Something
                </span>
              </button>

              <button
                onClick={() => {
                  setIsPostChooserOpen(false);
                  setActiveItem({ post_type: 'Found', category: 'Electronics', status: 'Open' });
                  setIsCreateOpen(true);
                }}
                className="p-4 rounded-2xl bg-[#1E4FA3] text-white flex flex-col items-center justify-center gap-2 btn-spring shadow-sm cursor-pointer"
              >
                <PackagePlus className="w-6 h-6" />
                <span className="font-heading font-extrabold text-xs uppercase tracking-wide">
                  I Found Something
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.9 CLAIM ITEM VERIFICATION MODAL */}
      {/* ---------------------------------------------------- */}
      {isClaimModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E9F2] p-6 shadow-2xl animate-motion-blur-dialog space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-wider block">
                  OWNERSHIP VERIFICATION
                </span>
                <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">
                  Claim "{activeItem.title}"
                </h3>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-[#6B7280]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              To protect student belongings and prevent fraudulent claims, describe secret details only the true owner would know (e.g. wallpaper, specific scratch, lock code hint, or serial number).
            </p>

            <form onSubmit={handleSubmitClaim} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                  Secret Identifying Detail *
                </label>
                <textarea
                  required
                  rows={3}
                  value={claimVerificationAnswer}
                  onChange={(e) => setClaimVerificationAnswer(e.target.value)}
                  placeholder="e.g. Inside the battery cover my initials 'C.O.' are engraved with a blue marker."
                  className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl p-3 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                  Your Contact Phone / Email (Shared upon verification)
                </label>
                <input
                  type="text"
                  value={claimContact}
                  onChange={(e) => setClaimContact(e.target.value)}
                  placeholder="e.g. 08012345678 or student@nileuniversity.edu.ng"
                  className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold btn-spring shadow-xs disabled:opacity-50"
                >
                  {claimSubmitting ? 'Submitting...' : 'Submit Claim Request →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.10 CREATE / EDIT ITEM MODAL (No native dropdowns!) */}
      {/* ---------------------------------------------------- */}
      {(isCreateOpen || isEditOpen) && (
        <ItemFormModal
          mode={isCreateOpen ? 'create' : 'edit'}
          initialData={activeItem || { post_type: 'Lost', category: 'Electronics', status: 'Open' }}
          onClose={() => {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            setActiveItem(null);
          }}
          onSubmit={(fields, file) => {
            if (isCreateOpen) handleCreatePost(fields, file);
            else handleUpdatePost(activeItem._id || activeItem.id, fields, file);
          }}
          submitting={postSubmitting}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.11 DELETE CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      {isDeleteOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5E9F2] p-6 text-center space-y-4 shadow-xl animate-motion-blur-dialog">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#F25C54] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">Remove this post?</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Are you sure you want to permanently delete <strong>"{activeItem.title}"</strong> from the campus registry?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteOpen(false);
                  setActiveItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={postSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#F25C54] hover:bg-rose-700 text-white text-xs font-heading font-bold btn-spring disabled:opacity-50"
              >
                {postSubmitting ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.12 FULLSCREEN IMAGE LIGHTBOX */}
      {/* ---------------------------------------------------- */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full rounded-2xl overflow-hidden bg-white border border-[#E5E9F2] shadow-2xl animate-motion-blur-dialog"
          >
            <div className="p-3 bg-[#EEF2F9] flex items-center justify-between border-b border-[#E5E9F2]">
              <span className="text-xs font-heading font-bold text-[#1E4FA3] truncate max-w-sm">
                {lightboxImage.title}
              </span>
              <button onClick={() => setLightboxImage(null)} className="text-[#6B7280] hover:text-[#1F2328] btn-spring">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-black">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.13 INTERACTIVE SPOTLIGHT PRODUCT TOUR (WALKTHROUGH) */}
      {/* ---------------------------------------------------- */}
      {isTourOpen && TOUR_STEPS[tourStep] && (
        <div className="fixed inset-0 z-50 pointer-events-auto overflow-hidden">
          {/* Spotlight Cutout Ring around the active DOM element */}
          {tourRect ? (
            <div
              onClick={closeProductTour}
              style={{
                top: `${Math.max(4, tourRect.top)}px`,
                left: `${Math.max(8, tourRect.left)}px`,
                width: `${Math.min(
                  tourRect.width,
                  (typeof window !== 'undefined' ? window.innerWidth : 390) - Math.max(8, tourRect.left) - 8
                )}px`,
                height: `${tourRect.height}px`
              }}
              className="fixed rounded-2xl tour-spotlight-ring pointer-events-none"
            />
          ) : (
            <div
              onClick={closeProductTour}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
          )}

          {/* Floating Step-by-Step Coach Mark Card */}
          <div
            style={
              tourRect
                ? {
                    top:
                      tourRect.top > (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 360)
                        ? `${Math.max(16, tourRect.top - 210)}px`
                        : `${Math.min(
                            (typeof window !== 'undefined' ? window.innerHeight - 230 : 460),
                            tourRect.bottom + 14
                          )}px`
                  }
                : {
                    top: '35%'
                  }
            }
            className="fixed inset-x-4 mx-auto max-w-sm bg-white rounded-2xl border border-[#BFDBFE] p-5 shadow-2xl z-50 transition-all duration-300 animate-dropdown-in space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EEF2F9] text-[#1E4FA3] border border-[#BFDBFE] text-[10px] font-mono tabular-nums font-bold uppercase tracking-wider">
                Step {tourStep + 1} of {TOUR_STEPS.length}
              </span>

              {/* Progress Dots */}
              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === tourStep ? 'w-5 bg-[#1E4FA3]' : 'w-1.5 bg-[#DBEAFE]'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={closeProductTour}
                className="text-[11px] font-semibold text-[#64748B] hover:text-[#1F2328] cursor-pointer"
              >
                Skip
              </button>
            </div>

            <div>
              <h4 className="font-heading font-extrabold text-sm text-[#16397A]">
                {TOUR_STEPS[tourStep].title}
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                {TOUR_STEPS[tourStep].description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                disabled={tourStep === 0}
                onClick={() => setTourStep(prev => Math.max(0, prev - 1))}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#64748B] hover:text-[#1E4FA3] hover:bg-[#EEF2F9] disabled:opacity-35 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {tourStep < TOUR_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setTourStep(prev => prev + 1)}
                  className="px-4 py-1.5 rounded-xl btn-nile-pill text-white text-xs font-heading font-bold flex items-center gap-1 btn-spring cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeProductTour}
                  className="px-4 py-1.5 rounded-xl btn-nile-pill text-white text-xs font-heading font-bold flex items-center gap-1.5 btn-spring cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish Tour</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2.14 FLOATING TOASTS */}
      {/* ---------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold toast-slide-in border ${
              toast.type === 'success'
                ? 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
                : toast.type === 'error'
                ? 'bg-white text-[#F25C54] border-[#F25C54]/30'
                : 'bg-white text-[#1E4FA3] border-[#1E4FA3]/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#F25C54]" />}
            {toast.type === 'info' && <Check className="w-4 h-4 shrink-0 text-[#1E4FA3]" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CUSTOM SELECT COMPONENT (Custom Dropdowns with Zero Native <select> tags)
// -----------------------------------------------------------------------------
function CustomSelect({ value, onChange, options, placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-[#E5E9F2] hover:border-[#1E4FA3] rounded-xl px-3 py-2 text-xs font-semibold text-[#1F2328] flex items-center justify-between gap-2 shadow-2xs btn-spring focus:outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-[#1E4FA3] shrink-0" />
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6B7280] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white border border-[#E5E9F2] rounded-xl shadow-xl p-1 animate-dropdown-in min-w-[140px] max-h-56 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                opt.value === value
                  ? 'bg-[#EEF2F9] text-[#1E4FA3] font-bold'
                  : 'text-[#1F2328] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {opt.icon && <opt.icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{opt.label}</span>
              </div>
              {opt.value === value && <Check className="w-3.5 h-3.5 text-[#1E4FA3] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ITEM FORM MODAL (Create & Edit with Custom Dropdowns and Photo Uploader)
// -----------------------------------------------------------------------------
function ItemFormModal({ mode, initialData, onClose, onSubmit, submitting }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    post_type: initialData.post_type || 'Lost',
    category: initialData.category || 'Electronics',
    location: initialData.location || '',
    contact_info: initialData.contact_info || '',
    status: initialData.status || 'Open',
    image_url: initialData.image_url || ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialData.image_url || '');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, imageFile);
  };

  const TYPE_OPTIONS = [
    { value: 'Lost', label: 'Lost Property', icon: Search },
    { value: 'Found', label: 'Found Property', icon: CheckCircle2 }
  ];

  const FORM_CATEGORIES = CATEGORIES.filter(c => c.value !== 'All');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E9F2] shadow-2xl overflow-hidden animate-motion-blur-dialog">
        {/* Modal Header */}
        <div className="p-4 bg-[#EEF2F9] border-b border-[#E5E9F2] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#1E4FA3] uppercase tracking-wider block">
              CAMPUS PROPERTY REGISTRY
            </span>
            <h3 className="font-heading font-extrabold text-base text-[#1E4FA3]">
              {mode === 'create' ? `Report a ${formData.post_type} Item` : 'Edit Property Report'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2328] btn-spring">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Post Type & Category Custom Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Post Type
              </label>
              <CustomSelect
                value={formData.post_type}
                onChange={(val) => setFormData({ ...formData, post_type: val })}
                options={TYPE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Category
              </label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={FORM_CATEGORIES}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Casio Scientific Calculator fx-991EX"
              className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
            />
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Campus Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Lecture Hall 3, Library 2nd Floor"
                className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
                Contact Info *
              </label>
              <input
                type="text"
                required
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder="Phone or Student Email"
                className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Description & Identifying Marks *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide color, brand, stickers, scratches, or unique contents..."
              className="w-full bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl p-3 text-xs text-[#1F2328] focus:outline-none focus:border-[#1E4FA3]"
            ></textarea>
          </div>

          {/* Real Photo Uploader */}
          <div>
            <label className="block text-[11px] font-bold text-[#1F2328] uppercase mb-1">
              Upload Item Photo (Drag & Drop or Tap)
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-[#1E4FA3] bg-[#EEF2F9]' : 'border-[#CBD5E1] hover:border-[#1E4FA3] bg-[#F8FAFC]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview" className="h-32 rounded-xl object-cover shadow-sm mx-auto" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setPreviewUrl('');
                      setFormData({ ...formData, image_url: '' });
                    }}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-7 h-7 text-[#1E4FA3] mx-auto" />
                  <p className="text-xs font-semibold text-[#1F2328]">Drag photo here or tap to choose</p>
                  <p className="text-[10px] text-[#6B7280]">Supports JPG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E5E9F2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-[#6B7280] btn-spring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#1E4FA3] hover:bg-[#16397A] text-white text-xs font-heading font-bold btn-spring shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Publishing Report...' : mode === 'create' ? 'Publish Report →' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
