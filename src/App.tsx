import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { 
  Shirt, 
  Leaf, 
  Bell, 
  Users, 
  HeartHandshake, 
  UserCircle, 
  Settings, 
  LogOut, 
  Menu, 
  Sun, 
  Moon, 
  Pencil, 
  Plus, 
  X, 
  Upload, 
  Check, 
  ImagePlus, 
  Flag, 
  CheckCircle, 
  Calendar, 
  Sparkles, 
  BarChart3, 
  Database, 
  Copy, 
  RefreshCw, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Search
} from 'lucide-react';
import { mockDatabase, getStoredSupabaseConfig } from './services/supabaseClient';
import { closetService } from './services/closetService';
import { friendsService } from './services/friendsService';
import { mapsService } from './services/mapsService';
import { DatabaseModal } from './components/DatabaseModal';
import { DonationMapSection } from './components/DonationMapSection';
import { 
  User, 
  ClothingItem, 
  Tag, 
  BSASAssessment, 
  DailyClothingLog, 
  FriendRequest, 
  Borrow, 
  DonationOpportunity, 
  DonationFlagType,
  AppNotification,
  AdditionType
} from './types/database';
import { 
  CURATED_COLOR_FAMILIES, 
  createGarmentSilhouette 
} from './data/seedData';

/* ================= CONSTANTS & CONFIG ================= */
const NAV_ITEMS = [
  { id: 'closet', label: 'Virtual Closet', icon: Shirt },
  { id: 'daily-log', label: 'Daily Outfit Log', icon: Calendar },
  { id: 'recovery', label: 'Recovery Progress', icon: Leaf },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'friends', label: 'Friends & Loans', icon: Users },
  { id: 'donations', label: 'Donation Map', icon: HeartHandshake },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const TYPES = ['Shirt', 'Skirt', 'Pants', 'Dress', 'Shorts', 'One-Piece', 'Shoes'];
const LENGTHS = ['Crop', 'Short', 'Mid-Length', 'Long'];
const NO_LENGTH_TYPES = ['Pants', 'Shoes'];
const INVALID_LEN: Record<string, string[]> = {
  Shorts: ['Long', 'Crop'],
  Dress: ['Crop'],
  Skirt: ['Crop']
};

const PALETTE = ['#3E6B45', '#5B7FA6', '#B98F5E', '#2A2A2E', '#C7A06B', '#8B5E6B'];

// 1.1 The 7 Diagnostic BSAS Criteria Items (0-7 scoring scale)
const BSAS_Q: [string, string][] = [
  ['Salience', 'You think about shopping and buying products all the time.'],
  ['Mood Modification', 'You shop or buy things in order to change your mood or relieve stress.'],
  ['Conflict', 'Shopping has caused friction with people close to you or impaired your daily responsibilities.'],
  ['Tolerance', 'You feel you have to buy more and more than before to achieve the same satisfaction.'],
  ['Withdrawal', 'You feel restless, anxious, or irritable if you are prevented or unable to shop.'],
  ['Relapse', 'You have tried to cut down or stop shopping, but were unable to succeed.'],
  ['Problems', 'Shopping has resulted in debts, financial difficulties, or harmed your personal wellbeing.']
];

const CATS = ['Salience', 'Mood Modification', 'Conflict', 'Tolerance', 'Withdrawal', 'Relapse', 'Problems'];

// 2.1.1 Client/Edge background removal algorithm using HTML5 Canvas
function removeImageBackground(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample border pixels to detect background chroma
      const sampleIndices = [
        0, 
        (canvas.width - 1) * 4, 
        ((canvas.height - 1) * canvas.width) * 4, 
        ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4
      ];
      let bgR = 0, bgG = 0, bgB = 0;
      sampleIndices.forEach(idx => {
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });
      bgR /= sampleIndices.length;
      bgG /= sampleIndices.length;
      bgB /= sampleIndices.length;

      const tolerance = 50;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.sqrt(
          Math.pow(r - bgR, 2) +
          Math.pow(g - bgG, 2) +
          Math.pow(b - bgB, 2)
        );
        if (dist < tolerance) {
          data[i + 3] = 0; // Transparent silhouette cutout
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

const FLAG_REASONS: [string, string][] = [
  ['dont_like_it', "Don't like it"],
  ['not_open', 'Not open'],
  ['inactive', 'Inactive'],
  ['out_of_date', 'Out of date']
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tagInvalid(type: string, length: string | null): boolean {
  if (!length) return false;
  if (NO_LENGTH_TYPES.includes(type)) return true;
  const bad = INVALID_LEN[type];
  return bad ? bad.includes(length) : false;
}

function overlaps(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return !(aTo < bFrom || aFrom > bTo);
}

function initials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ================= MAIN APPLICATION ================= */
export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('reapparel_theme') as 'light' | 'dark') || 'light';
  });

  // Navigation / View state - starts strictly on login page for public use
  const [view, setView] = useState<string>('login');
  const [sideOpen, setSideOpen] = useState(false);
  const [reqTab, setReqTab] = useState<'yours' | 'friends'>('yours');

  // Active User & Database state
  const [currentUser, setCurrentUser] = useState<User | null>(mockDatabase.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(mockDatabase.getAllUsers());
  const [garments, setGarments] = useState<ClothingItem[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [opportunities, setOpportunities] = useState<DonationOpportunity[]>([]);
  const [assessments, setAssessments] = useState<BSASAssessment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [todayLog, setTodayLog] = useState<DailyClothingLog>({
    log_id: 0,
    user_id: '',
    log_date: todayStr(),
    is_finalized: false,
    finalized_at: null,
    items: []
  });

  // Filter state for Virtual Closet (2.2 multi-attribute filtering)
  const [closetTypeSel, setClosetTypeSel] = useState<Set<string>>(new Set());
  const [closetColorSel, setClosetColorSel] = useState<Set<string>>(new Set());
  const [closetAdditionTypeSel, setClosetAdditionTypeSel] = useState<'All' | 'Old' | 'New'>('All');
  const [closetWearFilter, setClosetWearFilter] = useState<'all' | 'unworn' | 'low' | 'active'>('all');
  const [closetSearchQuery, setClosetSearchQuery] = useState('');

  // FAB & Modals
  const [fabOpen, setFabOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editColor, setEditColor] = useState<string>('');
  const [editColorName, setEditColorName] = useState<string>('');
  const [editAdditionType, setEditAdditionType] = useState<AdditionType>('Old');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [deleteCascadeModalGarment, setDeleteCascadeModalGarment] = useState<ClothingItem | null>(null);
  const [editFormWarn, setEditFormWarn] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // BSAS Assessment State & Cooldown test simulation offset
  const [bsasI, setBsasI] = useState<number>(0);
  const [bsasAns, setBsasAns] = useState<Record<number, number>>({});
  const [simulatedDaysOffset, setSimulatedDaysOffset] = useState<number>(0);

  // Auth (Login / Register) state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Borrow Flow State
  const [borrowCtx, setBorrowCtx] = useState<{ friendName: string; friendId: string; item: ClothingItem } | null>(null);
  const [friendSel, setFriendSel] = useState<User | null>(null);

  // Donations view state
  const [donHighlight, setDonHighlight] = useState<number | null>(null);

  // Confirmation Modal State
  const [confirmText, setConfirmText] = useState<string>('');
  const [confirmYes, setConfirmYes] = useState<(() => void) | null>(null);

  // Database / Supabase Config Modal
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Settings State
  const [notifPrefs, setNotifPrefs] = useState({
    borrowRequests: true,
    recoveryMilestones: true,
    donationDrives: true
  });

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('reapparel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load all applet data
  const loadData = useCallback(async () => {
    const user = mockDatabase.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {
      const items = await closetService.getItems(user.user_id);
      setGarments(items);

      const userAssessments = await closetService.getAssessments(user.user_id);
      setAssessments(userAssessments);

      const log = await closetService.getTodayLog();
      setTodayLog(log);

      setFriends(friendsService.getConnectedFriends());
      setFriendRequests(friendsService.getFriendRequests());
      setBorrows(friendsService.getBorrows());
    } else {
      setGarments([]);
      setAssessments([]);
      setFriends([]);
      setFriendRequests([]);
      setBorrows([]);
    }
    setOpportunities(mapsService.getDonationOpportunities());
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = mockDatabase.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Active Curated Color Families that the user has specifically put in their wardrobe
  const wardrobeColorFamilies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hex: string; count: number }>();

    garments.forEach(g => {
      const gName = (g.color || '').trim();
      const gHex = (g.color_tag || (g.image_url?.startsWith('#') ? g.image_url : '')).trim();

      // Find matching curated family by name, hex, or color_tag
      const matched = CURATED_COLOR_FAMILIES.find(f => 
        (gName && f.name.toLowerCase() === gName.toLowerCase()) ||
        (gHex && f.hex.toLowerCase() === gHex.toLowerCase())
      );

      const key = matched ? matched.name : (gName || gHex);
      if (!key) return; // Skip if no color defined

      const familyName = matched ? matched.name : (gName || 'Custom');
      const familyHex = gHex || matched?.hex || '#64748b';

      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, {
          id: key,
          name: familyName,
          hex: familyHex,
          count: 1
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [garments]);

  // Filtered Garments for Closet (2.2 Multi-attribute filtering: Category, Color, Addition Type, Wear Count, Search)
  const filteredGarments = useMemo(() => {
    return garments.filter(g => {
      const type = g.type_tag || g.category || '';
      const addition = g.addition_type || 'Old';
      const wear = g.worn_count ?? g.wear_count ?? 0;

      const matchType = closetTypeSel.size === 0 || closetTypeSel.has(type);
      const matchColor = closetColorSel.size === 0 || Array.from(closetColorSel).some(sel => {
        const s = sel.toLowerCase();
        const gName = (g.color || '').toLowerCase();
        const gTag = (g.color_tag || '').toLowerCase();
        const matched = CURATED_COLOR_FAMILIES.find(f => f.name.toLowerCase() === s || f.hex.toLowerCase() === s);
        if (matched) {
          return gName === matched.name.toLowerCase() || gTag === matched.hex.toLowerCase() || gTag === s;
        }
        return gName === s || gTag === s;
      });
      const matchAddition = closetAdditionTypeSel === 'All' || addition === closetAdditionTypeSel;

      let matchWear = true;
      if (closetWearFilter === 'unworn') matchWear = wear === 0;
      else if (closetWearFilter === 'low') matchWear = wear >= 1 && wear <= 4;
      else if (closetWearFilter === 'active') matchWear = wear >= 5;

      let matchSearch = true;
      if (closetSearchQuery.trim()) {
        const q = closetSearchQuery.toLowerCase();
        matchSearch = g.name.toLowerCase().includes(q) || type.toLowerCase().includes(q) || addition.toLowerCase().includes(q);
      }

      return matchType && matchColor && matchAddition && matchWear && matchSearch;
    });
  }, [garments, closetTypeSel, closetColorSel, closetAdditionTypeSel, closetWearFilter, closetSearchQuery]);

  // Environmental SDG 12 Analytics
  const analytics = useMemo(() => {
    return closetService.calculateClosetAnalytics(garments);
  }, [garments]);

  // Chart ref for Recovery Progress
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (view === 'recovery' && chartCanvasRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      if (assessments.length === 0) {
        // User has not taken the BSAS test yet: no fabricated or simulated recovery data
        return;
      }

      const snapshots = assessments.slice(0, 3).reverse();
      const colors = ['#B98F5E', '#8FCB93', '#3E6B45'];
      
      const chartDataSets = snapshots.map((s, idx) => ({
        label: idx === 0 ? 'Initial' : idx === 1 ? 'Previous' : 'Latest',
        data: CATS.map(c => {
          const key = c.toLowerCase().replace(/ /g, '_') as keyof typeof s.breakdown;
          return (s.breakdown && typeof s.breakdown[key] === 'number') ? s.breakdown[key] : (s.score || 0);
        }),
        backgroundColor: colors[idx % colors.length]
      }));

      chartInstanceRef.current = new Chart(chartCanvasRef.current, {
        type: 'bar',
        data: {
          labels: CATS,
          datasets: chartDataSets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 8,
              ticks: { stepSize: 1 }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [view, assessments]);

  // Clothing Item Management Actions (Module 2.0 Virtual Closet)
  const openGarmentForm = (id: number | null) => {
    setEditId(id);
    setEditFormWarn(null);
    if (id) {
      const g = garments.find(x => x.item_id === id);
      setEditImages(g?.images && g.images.length ? [...g.images] : [g?.color_tag || g?.image_url || '']);
      setEditColor(g?.color_tag || '');
      setEditColorName(g?.color || '');
      setEditAdditionType(g?.addition_type || 'Old');
      const cats = g?.tags ? g.tags.filter(t => t.tag_type === 'Category').map(t => t.tag_name) : [g?.type_tag || g?.category || 'Tops'];
      setEditCategories(cats.length ? cats : ['Tops']);
    } else {
      setEditImages([]);
      setEditColor('');
      setEditColorName('');
      setEditAdditionType('Old');
      setEditCategories(['Tops']);
    }
    setModal('garmentForm');
  };

  // 2.1.1 Client/Edge background removal of uploaded photos before saving
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - editImages.length;
    if (remainingSlots <= 0) {
      toast('Max 3 images per clothing item.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    filesToRead.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast('Please upload an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawResult = event.target?.result as string;
        if (rawResult) {
          toast('Removing image background (Edge canvas)...');
          try {
            const processedImg = await removeImageBackground(rawResult);
            setEditImages(prev => {
              if (prev.length >= 3) return prev;
              if (prev.length === 1 && prev[0].startsWith('#')) {
                return [processedImg];
              }
              return [...prev, processedImg];
            });
            toast('Background removed successfully!');
          } catch {
            setEditImages(prev => {
              if (prev.length >= 3) return prev;
              if (prev.length === 1 && prev[0].startsWith('#')) {
                return [rawResult];
              }
              return [...prev, rawResult];
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be reselected if needed
    e.target.value = '';
  };

  const addPreviewImage = () => {
    if (editImages.length >= 3) {
      toast('Max 3 images per clothing item');
      return;
    }
    const fallbackColor = editColor || '#3E6B45';
    setEditImages([...editImages, fallbackColor]);
  };

  const removePreviewImage = (index: number) => {
    if (editImages.length <= 1) {
      toast('A clothing item needs at least 1 image');
      return;
    }
    const updated = [...editImages];
    updated.splice(index, 1);
    setEditImages(updated);
  };

  // 2.1.2 & 2.1.3 Save Garment with Baseline Tag ("Old" | "New") & Tag Catalog
  const saveGarmentForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const type = (fd.get('type_tag') as string) || editCategories[0] || 'Tops';

    if (!name) {
      setEditFormWarn('Please enter a garment name.');
      return;
    }

    if (!editId && garments.length >= 100) {
      toast('Closet limit reached (100 clothing items).');
      return;
    }

    // Color is required for the submission of new clothing items
    const chosenColor = (fd.get('color_tag') as string) || editColor;
    if (!chosenColor || !chosenColor.trim()) {
      setEditFormWarn('Color is required for clothing item submission. Please choose a color family.');
      toast('Color is required for clothing item submission.');
      return;
    }

    const resolvedColorName = editColorName.trim() || 
      CURATED_COLOR_FAMILIES.find(f => f.hex.toLowerCase() === chosenColor.toLowerCase())?.name || 
      'Custom';

    // Primary image: if no photo uploaded, generate a crisp silhouette with the required chosen color
    let finalImages = [...editImages];
    if (finalImages.length === 0 || (finalImages.length === 1 && finalImages[0].startsWith('#'))) {
      const silhouette = createGarmentSilhouette(chosenColor, name, (editCategories[0]?.toLowerCase() as any) || 'top');
      finalImages = [silhouette];
    }
    const primaryImg = finalImages[0];

    // Build tags from available catalog
    const allTags = mockDatabase.getTags();
    const assignedTags: Tag[] = [];
    editCategories.forEach(catName => {
      const match = allTags.find(t => t.tag_type === 'Category' && t.tag_name.toLowerCase() === catName.toLowerCase());
      if (match) assignedTags.push(match);
      else assignedTags.push({ tag_id: Date.now() + Math.floor(Math.random() * 1000), tag_name: catName, tag_type: 'Category' });
    });

    const colorTagMatch = allTags.find(t => t.tag_type === 'Color' && (
      t.tag_name.toLowerCase() === resolvedColorName.toLowerCase() ||
      (t.hex_color && t.hex_color.toLowerCase() === chosenColor.toLowerCase())
    ));
    if (colorTagMatch) {
      assignedTags.push(colorTagMatch);
    } else {
      assignedTags.push({
        tag_id: Date.now() + Math.floor(Math.random() * 1000),
        tag_name: resolvedColorName,
        tag_type: 'Color',
        hex_color: chosenColor
      });
    }

    if (editId) {
      await closetService.updateItem(editId, {
        name,
        type_tag: type,
        category: editCategories[0] || type,
        length_tag: null,
        color: resolvedColorName,
        color_tag: chosenColor,
        image_url: primaryImg,
        addition_type: editAdditionType,
        images: finalImages,
        tags: assignedTags
      });
      toast(`Clothing item updated (${editAdditionType} purchase)`);
    } else {
      if (!currentUser) {
        toast('Please log in or register first.');
        return;
      }
      await closetService.addItem({
        user_id: currentUser.user_id,
        name,
        type_tag: type,
        category: editCategories[0] || type,
        length_tag: null,
        color: resolvedColorName,
        color_tag: chosenColor,
        image_url: primaryImg,
        addition_type: editAdditionType,
        images: finalImages,
        tags: assignedTags
      });
      toast(`Added ${editAdditionType === 'New' ? 'new purchase' : 'pre-existing'} garment to closet`);
    }

    setModal(null);
    setEditId(null);
    setEditFormWarn(null);
    await loadData();
  };

  const deleteGarment = async (id: number) => {
    const activeBorrow = borrows.some(
      r => r.item_id === id && (r.status === 'Accepted' || (r.status as string) === 'approved')
    );
    if (activeBorrow) {
      toast("Can't delete — this item is currently borrowed by a friend.");
      return;
    }
    await closetService.deleteItem(id);
    setModal(null);
    setEditId(null);
    toast('Clothing item removed from closet with cascade protection');
    await loadData();
  };

  // 1.1 BSAS Submission & Step Progression (7 Diagnostic Items, 0-7 Scoring)
  const handleBsasAnswerSelect = async (questionIndex: number, answerValue: number) => {
    const updatedAnswers = { ...bsasAns, [questionIndex]: answerValue };
    setBsasAns(updatedAnswers);

    if (questionIndex < 6) {
      setBsasI(questionIndex + 1);
      return;
    }

    // All 7 diagnostic questions answered:
    // Diagnostic criteria with score >= 4 (Often/Always/Endorsed) are counted toward risk categorization
    const categoryTotals: Record<string, number> = {};
    CATS.forEach((c, idx) => {
      categoryTotals[c] = updatedAnswers[idx] || 0;
    });

    const criteriaEndorsedCount = Object.values(updatedAnswers).filter(val => val >= 4).length;
    const finalScore = criteriaEndorsedCount; // 0 to 7 diagnostic score

    await closetService.submitAssessment(finalScore, {
      salience: categoryTotals['Salience'] || 0,
      mood_modification: categoryTotals['Mood Modification'] || 0,
      conflict: categoryTotals['Conflict'] || 0,
      tolerance: categoryTotals['Tolerance'] || 0,
      relapse: categoryTotals['Relapse'] || 0,
      withdrawal: categoryTotals['Withdrawal'] || 0,
      problems: categoryTotals['Problems'] || 0
    });

    toast(finalScore >= 4 ? 'Check-in saved: Indicative risk identified' : 'Check-in saved: Non-Indicative risk level');
    setView('recovery');
    await loadData();
  };

  // Friend Request Actions (Accept & Decline Handshake)
  const handleAcceptFriend = async (requestId: number, senderName?: string) => {
    friendsService.respondToRequest(requestId, 'accepted');
    toast(`You and ${senderName || 'your friend'} are now connected!`);
    await loadData();
  };

  const handleRejectFriend = async (requestId: number) => {
    friendsService.respondToRequest(requestId, 'rejected');
    toast('Friend request declined.');
    await loadData();
  };

  const handleQuickSwitchUser = async (targetUserId: string) => {
    mockDatabase.setCurrentUserId(targetUserId);
    await loadData();
    const newUser = mockDatabase.getCurrentUser();
    toast(`Active profile switched to ${newUser?.first_name} ${newUser?.last_name}`);
  };

  // Borrow Request Actions
  const handleBorrowSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!borrowCtx) return;
    const fd = new FormData(e.currentTarget);
    const from = fd.get('from') as string;
    const to = fd.get('to') as string;

    if (new Date(to) < new Date(from)) {
      toast('Return date must be after borrow date');
      return;
    }

    const hasConflict = borrows.some(
      r => r.item_id === borrowCtx.item.item_id &&
           (r.status === 'Accepted' || (r.status as string) === 'approved') &&
           overlaps(from, to, r.start_date, r.end_date)
    );

    if (hasConflict) {
      toast('Those dates overlap an existing approved borrow.');
      return;
    }

    friendsService.requestBorrow(borrowCtx.item.item_id, from, to);
    toast('Borrow request sent');
    setView('requests');
    setReqTab('yours');
  };

  const handleCancelBorrow = (borrowId: number, startDate: string) => {
    const doCancel = () => {
      friendsService.updateBorrowStatus(borrowId, 'Rejected');
      setModal(null);
      toast('Borrow request cancelled');
    };

    if (new Date(startDate) > new Date()) {
      setConfirmText('Your request will be cancelled. Proceed anyway?');
      setConfirmYes(() => doCancel);
      setModal('confirm');
    } else {
      doCancel();
    }
  };

  const handleRespondBorrow = (borrowId: number, newStatus: 'Accepted' | 'Rejected' | 'Returned') => {
    if (newStatus === 'Accepted') {
      const targetBorrow = borrows.find(b => b.borrow_id === borrowId);
      if (targetBorrow) {
        const conflict = borrows.some(
          b => b.borrow_id !== borrowId &&
               b.item_id === targetBorrow.item_id &&
               (b.status === 'Accepted' || (b.status as string) === 'approved') &&
               overlaps(targetBorrow.start_date, targetBorrow.end_date, b.start_date, b.end_date)
        );
        if (conflict) {
          toast('Dates overlap another approved borrow on this item.');
          return;
        }
      }
    }
    friendsService.updateBorrowStatus(borrowId, newStatus);
    if (newStatus === 'Accepted') {
      toast('Borrow request accepted! Loan schedule active.');
    } else if (newStatus === 'Returned') {
      toast('Item marked as returned! Garment is now back in your closet.');
    } else {
      toast('Borrow request declined.');
    }
    loadData();
  };

  // Flag donation opportunity
  const handleFlagDonation = (donationId: number, reason: string) => {
    mapsService.addFlag(donationId, 'Inactive', reason);
    toast('Thanks — flag recorded for other users to see.');
    loadData();
  };

  // Account deletion check
  const handleDeleteAccountFlow = () => {
    const blocked = borrows.some(
      r => (r.status === 'Accepted' || (r.status as string) === 'approved') && r.end_date >= todayStr()
    );
    if (blocked) {
      toast('Active, unreturned borrows are linked to your account.');
      return;
    }
    mockDatabase.clearAllData();
    mockDatabase.setCurrentUserId(null);
    setCurrentUser(null);
    toast('Account and data deleted');
    setView('login');
  };

  // Mark what you wore today (Daily log quick action)
  const handleToggleTodayOutfitItem = async (garment: ClothingItem) => {
    if (todayLog.is_finalized) {
      toast("Today's log is already finalized!");
      return;
    }
    const current = todayLog.items || [];
    const exists = current.some(i => i.item_id === garment.item_id);
    const updated = exists 
      ? current.filter(i => i.item_id !== garment.item_id)
      : [...current, garment];

    await closetService.updateTodayItems(todayLog.log_id, updated);
    await loadData();
    toast(exists ? `Removed ${garment.name} from today's outfit` : `Added ${garment.name} to today's outfit`);
  };

  const handleFinalizeTodayLog = async () => {
    if (!todayLog.items || todayLog.items.length === 0) {
      toast('Pick at least one clothing item you wore today.');
      return;
    }
    await closetService.finalizeDailyLog(todayLog.log_id);
    await loadData();
    toast("Outfit logged! Clothing item wear counts updated.");
  };

  // 3.2 Update & Delete Daily Wear Log (Free edits throughout calendar day until finalized)
  const handleDeleteTodayLog = async () => {
    if (todayLog.is_finalized) {
      toast("Today's log is already finalized and locked at midnight.");
      return;
    }
    await closetService.deleteDailyLog(todayLog.log_id);
    await loadData();
    toast("Today's daily clothing log cleared / deleted.");
  };

  // 3.3 Midnight Finalization (pg_cron / edge trigger 00:00 locking & wear count increment)
  const handleSimulateMidnight = async () => {
    if (todayLog.is_finalized) {
      toast("Daily log is already locked and finalized for today.");
      return;
    }
    if (!todayLog.items || todayLog.items.length === 0) {
      toast('Select at least one garment worn today before triggering finalization.');
      return;
    }
    await closetService.simulateMidnightFinalization();
    await loadData();
    toast("🕛 00:00 Midnight Job Simulated: Outfit log locked, wear counts incremented, edits frozen!");
  };

  /* ================= SUBVIEWS ================= */

  // 1. LOGIN / REGISTRATION
  if (view === 'login') {
    const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setAuthError(null);

      if (authMode === 'login') {
        const identifier = authEmail.trim();
        if (!identifier) {
          setAuthError('Please enter your email or friend code.');
          return;
        }
        const loggedUser = mockDatabase.loginUser(identifier);
        if (loggedUser) {
          setCurrentUser(loggedUser);
          await loadData();
          toast(`Welcome back, ${loggedUser.first_name}!`);
          setView('closet');
        } else {
          // If not found in mock, create or log in gracefully
          const fallbackUser = mockDatabase.registerUser({
            email: identifier.includes('@') ? identifier : `${identifier}@reapparel.local`,
            first_name: identifier.split('@')[0],
            last_name: ''
          });
          setCurrentUser(fallbackUser);
          await loadData();
          toast(`Logged in as ${fallbackUser.first_name}`);
          setView('bsasIntro');
        }
      } else {
        // Register mode
        const email = authEmail.trim();
        const firstName = authFirstName.trim();
        const lastName = authLastName.trim();

        if (!email || !firstName) {
          setAuthError('First name and email are required.');
          return;
        }

        if (!email.includes('@')) {
          setAuthError('Please enter a valid email address.');
          return;
        }

        if (authPassword && authPassword.length < 6) {
          setAuthError('Password must be at least 6 characters.');
          return;
        }

        if (authPassword !== authConfirmPassword) {
          setAuthError('Passwords do not match. Please re-enter your confirm password.');
          return;
        }

        const newUser = mockDatabase.registerUser({
          email,
          first_name: firstName,
          last_name: lastName
        });

        setCurrentUser(newUser);
        await loadData();
        toast(`Account created! Welcome, ${newUser.first_name}.`);
        // New users take the BSAS check-in before their closet
        setView('bsasIntro');
      }
    };

    return (
      <div className="center-shell">
        <div style={{ maxWidth: 410 }} className="card w-full shadow-lg">
          <div className="flex justify-center mb-2">
            <span className="dot" style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(155deg, var(--primary), var(--primary-strong))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 19,
              fontWeight: 700
            }}>R</span>
          </div>
          <h2 style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 4 }}>ReApparel</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>
            A mindful home for your closet.
          </p>

          {/* Login / Register Segmented Tabs */}
          <div className="tabs" style={{ width: '100%', marginBottom: 16 }}>
            <button 
              type="button"
              className={authMode === 'login' ? 'active' : ''} 
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
            >
              Log in
            </button>
            <button 
              type="button"
              className={authMode === 'register' ? 'active' : ''} 
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="warn" style={{ marginBottom: 12 }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>First name</label>
                  <input 
                    placeholder="e.g. Maria" 
                    value={authFirstName}
                    onChange={(e) => setAuthFirstName(e.target.value)}
                    required 
                  />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input 
                    placeholder="e.g. Cruz" 
                    value={authLastName}
                    onChange={(e) => setAuthLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label>{authMode === 'register' ? 'Email address' : 'Email or username'}</label>
              <input 
                type={authMode === 'register' ? 'email' : 'text'}
                placeholder={authMode === 'register' ? 'you@example.com' : 'Email or Friend Code'}
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required 
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required 
              />
              {authMode === 'register' && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                  At least 6 characters
                </span>
              )}
            </div>

            {authMode === 'register' && (
              <div className="field">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  required 
                />
              </div>
            )}

            <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: '10px 16px' }}>
              {authMode === 'login' ? 'Log in' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {authMode === 'login' ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Don&apos;t have an account yet?{' '}
                <button 
                  type="button" 
                  style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                >
                  Register here
                </button>
              </p>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Already registered?{' '}
                <button 
                  type="button" 
                  style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                >
                  Log in instead
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. BSAS INTRO
  if (view === 'bsasIntro') {
    return (
      <div className="center-shell">
        <div style={{ maxWidth: 450 }} className="card w-full shadow-lg">
          <h3 style={{ fontStyle: 'italic', fontSize: 20, marginBottom: 8 }}>Bergen Shopping Reflection (BSAS)</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Before organizing your closet, take the Bergen Shopping Addiction Scale Questionnaire — a 7-question diagnostic reflection evaluating core shopping habit dimensions (Salience, Mood Modification, Conflict, Tolerance, Withdrawal, Relapse, and Problems).
          </p>
          <div className="warn" style={{ margin: '14px 0', fontSize: 12.5 }}>
            This is a self-reflection habit assessment (0–7 score scale), not a clinical diagnosis. Scores &ge; 4 indicate shopping addiction risk and unlock behavioral circular-fashion guidance.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button 
              className="btn btn-p" 
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
              onClick={() => { setBsasI(0); setBsasAns({}); setView('bsas'); }}
            >
              Begin 7-Question Reflection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. BSAS QUESTIONNAIRE (1.1 7 Diagnostic Questions, 0-7 Radio/Slider Interface)
  if (view === 'bsas') {
    const [cat, text] = BSAS_Q[bsasI];
    const sel = bsasAns[bsasI];

    const SCORING_LEVELS = [
      { val: 0, label: '0 – Never / Completely Disagree' },
      { val: 1, label: '1 – Very Rarely' },
      { val: 2, label: '2 – Rarely' },
      { val: 3, label: '3 – Sometimes' },
      { val: 4, label: '4 – Often (Diagnostic Criterion Met)' },
      { val: 5, label: '5 – Very Often' },
      { val: 6, label: '6 – Nearly Always' },
      { val: 7, label: '7 – Always / Strongly Endorse' },
    ];

    return (
      <div className="center-shell">
        <div style={{ maxWidth: 500 }} className="card w-full shadow-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Diagnostic Dimension {bsasI + 1} of 7: <strong className="text-emerald-800">{cat}</strong>
            </span>
            <span className="pill on" style={{ fontSize: 11 }}>0–7 Scoring</span>
          </div>
          <h3 style={{ margin: '10px 0 16px', fontSize: 17, lineHeight: 1.4 }}>{text}</h3>
          
          {/* 1.1 Clean, supportive slider interface (0-7 scoring) */}
          <div style={{ background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Response Slider:</span>
              <strong style={{ fontSize: 14, color: (sel ?? 0) >= 4 ? 'var(--danger)' : 'var(--primary)' }}>
                {sel !== undefined ? `Selected Score: ${sel} / 7` : 'Slide or tap to score'}
              </strong>
            </div>
            <input 
              type="range"
              min="0"
              max="7"
              step="1"
              value={sel ?? 0}
              onChange={(e) => setBsasAns(prev => ({ ...prev, [bsasI]: parseInt(e.target.value, 10) }))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0 (Never)</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span style={{ color: 'var(--danger)', fontWeight: 700 }}>4 (Criterion)</span>
              <span>5</span>
              <span>6</span>
              <span>7 (Always)</span>
            </div>
            {sel !== undefined && (
              <button 
                type="button" 
                className="btn btn-p" 
                style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12.5 }}
                onClick={() => handleBsasAnswerSelect(bsasI, sel)}
              >
                Confirm Score ({sel}) &amp; {bsasI < 6 ? 'Next Dimension →' : 'Calculate BSAS Results'}
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            Or choose a supportive radio option:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SCORING_LEVELS.map(({ val, label }) => {
              const isSelected = sel === val;
              const isCriterionThreshold = val >= 4;
              return (
                <button
                  key={val}
                  type="button"
                  className={`btn ${isSelected ? 'btn-p' : 'btn-g'}`}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'flex-start', 
                    padding: '8px 12px',
                    fontSize: 12.5,
                    border: isCriterionThreshold && isSelected ? '2px solid var(--primary-strong)' : undefined
                  }}
                  onClick={() => handleBsasAnswerSelect(bsasI, val)}
                >
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: isSelected ? '5px solid #ffffff' : '2px solid var(--border)',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    display: 'inline-block',
                    marginRight: 8,
                    flexShrink: 0
                  }} />
                  <span className="w-6 font-mono font-bold" style={{ opacity: isSelected ? 1 : 0.7 }}>
                    {val}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <button 
              type="button"
              className="btn btn-g" 
              disabled={bsasI === 0}
              onClick={() => setBsasI(prev => prev - 1)}
              style={{ fontSize: 12, padding: '5px 10px' }}
            >
              ← Previous Question
            </button>
            <span className="text-xs text-muted font-mono">{bsasI + 1} / 7 Diagnostic Items</span>
          </div>
        </div>
      </div>
    );
  }

  // Active view content renderer
  const renderContent = () => {
    switch (view) {
      // -----------------------------------------------------------------------
      // CLOSET
      // -----------------------------------------------------------------------
      // CLOSET (Module 2.0 Virtual Closet)
      // -----------------------------------------------------------------------
      case 'closet':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>My Closet</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {filteredGarments.length} shown of {garments.length} total garments (Max 100)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-g"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setView('daily-log')}
                  title="Compose today's outfit wear log"
                >
                  <Calendar className="ico" style={{ width: 14, height: 14 }} /> Outfit Builder
                </button>
                <button 
                  className="btn btn-p" 
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => openGarmentForm(null)}
                >
                  <Plus className="ico" style={{ width: 14, height: 14 }} /> Add Garment
                </button>
              </div>
            </div>

            {/* 2.2 Search Bar */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search className="ico" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', width: 16, height: 16 }} />
              <input 
                type="text"
                placeholder="Search garments by name, category, or baseline addition type..."
                value={closetSearchQuery}
                onChange={(e) => setClosetSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, fontSize: 13, borderRadius: 8, margin: 0 }}
              />
              {closetSearchQuery && (
                <button 
                  type="button" 
                  onClick={() => setClosetSearchQuery('')}
                  style={{ position: 'absolute', right: 10, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* 2.2 Multi-attribute filters: Baseline Addition Type ("Old" vs "New") & Wear Count */}
            <div className="card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 90 }}>Baseline Tag:</span>
                {(['All', 'Old', 'New'] as const).map(atype => {
                  const on = closetAdditionTypeSel === atype;
                  const count = atype === 'All' ? garments.length : garments.filter(g => g.addition_type === atype).length;
                  return (
                    <button
                      key={atype}
                      type="button"
                      className={`pill ${on ? 'on' : ''}`}
                      style={{ cursor: 'pointer', padding: '3px 10px', fontSize: 11.5, border: 'none' }}
                      onClick={() => setClosetAdditionTypeSel(atype)}
                    >
                      {atype === 'All' ? 'All Items' : atype === 'Old' ? '🌿 Old (Pre-existing)' : '✨ New (Recent Purchase)'} ({count})
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 90 }}>Wear Rotation:</span>
                {[
                  { id: 'all', label: 'All Rotation Levels' },
                  { id: 'unworn', label: '⚠️ Unworn (0 wears)' },
                  { id: 'low', label: '🌱 Low (1–4 wears)' },
                  { id: 'active', label: '🔥 Active (5+ wears)' }
                ].map(wf => {
                  const on = closetWearFilter === wf.id;
                  return (
                    <button
                      key={wf.id}
                      type="button"
                      className={`pill ${on ? 'on' : ''}`}
                      style={{ cursor: 'pointer', padding: '3px 10px', fontSize: 11.5, border: 'none' }}
                      onClick={() => setClosetWearFilter(wf.id as any)}
                    >
                      {wf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type / Category filter accordion */}
            <details className="acc">
              <summary>Categories &amp; Garment Types ({closetTypeSel.size > 0 ? `${closetTypeSel.size} selected` : 'All'})</summary>
              <div style={{ paddingTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TYPES.map(t => {
                  const on = closetTypeSel.has(t);
                  return (
                    <span 
                      key={t}
                      className={`pill ${on ? 'on' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const s = new Set(closetTypeSel);
                        s.has(t) ? s.delete(t) : s.add(t);
                        setClosetTypeSel(s);
                      }}
                    >
                      {t}
                    </span>
                  );
                })}
                {closetTypeSel.size > 0 && (
                  <button 
                    className="btn btn-g" 
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => setClosetTypeSel(new Set())}
                  >
                    Reset Categories
                  </button>
                )}
              </div>
            </details>

            {/* Curated Color Families filter accordion - strictly derived from user's active wardrobe */}
            <details className="acc" open>
              <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>Curated Color Families ({closetColorSel.size > 0 ? `${closetColorSel.size} selected` : 'All'})</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {wardrobeColorFamilies.length} in wardrobe
                </span>
              </summary>
              <div style={{ paddingTop: 8 }}>
                {wardrobeColorFamilies.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                    No colors in your wardrobe yet. Add clothing items with required color tags to curate your palette.
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    {wardrobeColorFamilies.map(cf => {
                      const on = closetColorSel.has(cf.id) || closetColorSel.has(cf.name) || closetColorSel.has(cf.hex);
                      return (
                        <button
                          key={cf.id}
                          type="button"
                          className={`pill ${on ? 'on' : ''}`}
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 16,
                            background: on ? 'var(--primary)' : 'var(--surface-2)',
                            color: on ? '#ffffff' : 'var(--text)',
                            border: on ? '2px solid var(--primary)' : '1px solid var(--border)'
                          }}
                          onClick={() => {
                            const s = new Set(closetColorSel);
                            if (s.has(cf.id) || s.has(cf.name) || s.has(cf.hex)) {
                              s.delete(cf.id);
                              s.delete(cf.name);
                              s.delete(cf.hex);
                            } else {
                              s.add(cf.name);
                            }
                            setClosetColorSel(s);
                          }}
                        >
                          <span
                            style={{
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              backgroundColor: cf.hex,
                              border: '1px solid rgba(0,0,0,0.2)',
                              display: 'inline-block',
                              flexShrink: 0
                            }}
                          />
                          <span>{cf.name}</span>
                          <span style={{ fontSize: 10, opacity: 0.8 }}>({cf.count})</span>
                          {on && <span style={{ fontSize: 11 }}>✓</span>}
                        </button>
                      );
                    })}
                    {closetColorSel.size > 0 && (
                      <button 
                        type="button"
                        className="btn btn-g" 
                        style={{ padding: '3px 9px', fontSize: 11 }}
                        onClick={() => setClosetColorSel(new Set())}
                      >
                        Clear colors
                      </button>
                    )}
                  </div>
                )}
              </div>
            </details>

            {/* Clothing Items Grid */}
            <div className="grid" style={{ marginTop: 16 }}>
              {filteredGarments.map(g => {
                const imgs = g.images && g.images.length ? g.images : [g.color_tag || g.image_url || '#3E6B45'];
                const isSelectedToday = (todayLog.items || []).some(i => i.item_id === g.item_id);

                return (
                  <div key={g.item_id} className="gcard">
                    {/* Carousel */}
                    <div className="gimgs">
                      {imgs.map((imgSrc, i) => {
                        const isColor = imgSrc.startsWith('#');
                        return (
                          <div 
                            key={i} 
                            style={isColor ? { background: imgSrc } : { backgroundImage: `url(${imgSrc})` }}
                          >
                            {isColor && <span>Photo {i + 1}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {imgs.length > 1 && (
                      <div className="gdots">
                        {imgs.map((_, i) => (
                          <span key={i}></span>
                        ))}
                      </div>
                    )}

                    {/* Edit button badge */}
                    <button 
                      className="badge-av" 
                      title="Edit clothing item"
                      onClick={() => openGarmentForm(g.item_id)}
                    >
                      <Pencil className="ico" />
                    </button>

                    <div className="gbody">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <strong style={{ fontSize: 13.5 }}>{g.name}</strong>
                        {g.addition_type === 'New' ? (
                          <span className="pill" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: 10.5, flexShrink: 0 }}>
                            ✨ New
                          </span>
                        ) : (
                          <span className="pill" style={{ background: 'var(--surface-3)', fontSize: 10.5, flexShrink: 0 }}>
                            🌿 Old
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {g.worn_count ?? g.wear_count ?? 0}× worn
                      </div>
                      
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {[g.type_tag || g.category].filter(Boolean).map(t => (
                          <span key={t} className="pill" style={{ fontSize: 10.5 }}>{t}</span>
                        ))}
                        {g.tags && g.tags.filter(t => t.tag_type === 'Color').map(ct => (
                          <span key={ct.tag_id} className="pill" style={{ fontSize: 10.5, opacity: 0.85 }}>
                            🎨 {ct.tag_name}
                          </span>
                        ))}
                      </div>

                      {/* Quick mark as worn button */}
                      <button
                        className={`btn ${isSelectedToday ? 'btn-p' : 'btn-g'}`}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '5px 10px', fontSize: 12 }}
                        onClick={() => handleToggleTodayOutfitItem(g)}
                      >
                        <Check className="ico" />
                        {isSelectedToday ? 'Worn Today ✓' : 'Mark Worn Today'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGarments.length === 0 && (
              <div className="card text-center py-12" style={{ marginTop: 16 }}>
                {garments.length === 0 ? (
                  <div>
                    <div style={{ 
                      width: 52, 
                      height: 52, 
                      borderRadius: '50%', 
                      background: 'var(--surface-3)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 12px',
                      color: 'var(--primary)'
                    }}>
                      <Shirt style={{ width: 28, height: 28 }} />
                    </div>
                    <strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>Your virtual closet is empty</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13.5, maxWidth: 360, margin: '0 auto 16px', lineHeight: 1.5 }}>
                      Start building your conscious wardrobe by cataloging the clothing items you already own.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No clothing items match these filters.</p>
                    <button 
                      className="btn btn-g" 
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        setClosetTypeSel(new Set());
                        setClosetColorSel(new Set());
                      }}
                    >
                      Reset all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Floating Action Button (FAB) - single circle button on bottom right */}
            <button 
              className="fab" 
              onClick={() => openGarmentForm(null)}
              title="Add clothing item"
              aria-label="Add clothing item"
            >
              <Plus className="ico" style={{ width: 26, height: 26 }} />
            </button>
          </div>
        );

      // -----------------------------------------------------------------------
      // RECOVERY PROGRESS & SDG 12 WARDROBE ANALYTICS (Unified)
      // -----------------------------------------------------------------------
      case 'recovery':
      case 'analytics':
        const actuallyWornItems = analytics.mostWorn.filter(i => (i.worn_count ?? i.wear_count ?? 0) > 0);
        const latestAssessment = assessments[0] || null;
        const rawDaysSinceAssessment = latestAssessment ? Math.floor((Date.now() - new Date(latestAssessment.taken_at).getTime()) / (1000 * 3600 * 24)) : null;
        const daysSinceAssessment = rawDaysSinceAssessment !== null ? (rawDaysSinceAssessment + simulatedDaysOffset) : null;
        const isCooldownActive = daysSinceAssessment !== null && daysSinceAssessment < 30;
        const daysRemaining = daysSinceAssessment !== null ? Math.max(0, 30 - daysSinceAssessment) : 0;
        const isMonthlyDue = daysSinceAssessment !== null && daysSinceAssessment >= 30;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Recovery Progress &amp; SDG 12 Analytics</h2>
              <button 
                className="btn btn-g" 
                onClick={() => setView('closet')}
              >
                ← Back to Closet
              </button>
            </div>

            {/* BSAS Reflection Progress Card */}
            <div className="card">
              <strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>Bergen Shopping Addiction Scale (BSAS) Habit Dimensions</strong>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                Self-reflection habit tracking across 7 dimensions
              </div>

              {assessments.length > 0 ? (
                <div style={{ height: 260, marginBottom: 12 }}>
                  <canvas ref={chartCanvasRef} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface-2)', borderRadius: 10, margin: '8px 0 14px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    color: 'var(--primary)'
                  }}>
                    <Leaf style={{ width: 22, height: 22 }} />
                  </div>
                  <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>No reflection completed yet</strong>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 12px', lineHeight: 1.4 }}>
                    You haven&apos;t taken the BSAS test yet. Take your first 14-question reflection to begin charting your habit dimensions.
                  </p>
                  <button 
                    className="btn btn-p" 
                    onClick={() => setView('bsasIntro')}
                  >
                    Take BSAS Reflection
                  </button>
                </div>
              )}

              {assessments.length > 0 && latestAssessment && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>1.2 Score Interpretation &amp; Risk Category</strong>
                    {latestAssessment.score >= 4 ? (
                      <span className="pill" style={{ background: '#fef2f2', color: '#b91c1c', fontWeight: 700, border: '1px solid #f87171' }}>
                        ⚠️ INDICATIVE RISK ({latestAssessment.score}/7 Criteria)
                      </span>
                    ) : (
                      <span className="pill on" style={{ fontWeight: 700 }}>
                        ✓ NON-INDICATIVE ({latestAssessment.score}/7 Criteria)
                      </span>
                    )}
                  </div>

                  {/* Actionable Behavioral Guidance */}
                  <div className="card" style={{ background: 'var(--surface-2)', padding: '12px 14px', marginBottom: 10 }}>
                    <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Actionable Behavioral Guidance:</strong>
                    {latestAssessment.score >= 4 ? (
                      <ul style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                        <li><strong>30-Day Purchase Freeze:</strong> Pause non-essential apparel purchases and focus entirely on circulating existing items.</li>
                        <li><strong>72-Hour Delay Rule:</strong> Before acquiring any item, institute a mandatory 3-day reflection period to overcome impulse shopping.</li>
                        <li><strong>Borrow &amp; Share First:</strong> Leverage ReApparel&apos;s Friend Request Board to borrow outfits for special occasions instead of buying new.</li>
                        <li><strong>Support Resource:</strong> If shopping triggers distress or financial strain, consider speaking with a mental health professional or counselor.</li>
                      </ul>
                    ) : (
                      <ul style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                        <li><strong>Mindful Wardrobe Maintenance:</strong> Continue conscious rotation and logging what you wear daily.</li>
                        <li><strong>Circulate Pre-Loved Items:</strong> Offer gently used garments on the Friend Borrow Board or donate to verified community bins.</li>
                        <li><strong>Intentional Audits:</strong> Keep track of unworn items to ensure zero garment neglect.</li>
                      </ul>
                    )}
                  </div>

                  {/* 1.3 30-Day Cooldown Banner & Monthly Retake Due Alert */}
                  {isCooldownActive && (
                    <div className="card" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>⏳</span>
                        <div style={{ flex: 1, fontSize: 12.5 }}>
                          <strong>30-Day Assessment Cooldown:</strong> Your next BSAS reflection retake will unlock in <strong>{daysRemaining} day{daysRemaining === 1 ? '' : 's'}</strong> (Last taken {new Date(latestAssessment.taken_at).toLocaleDateString()}).
                        </div>
                      </div>
                    </div>
                  )}

                  {isMonthlyDue && (
                    <div className="card" style={{ background: 'rgba(62, 107, 69, 0.1)', border: '1px solid var(--primary)', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🔔</span>
                        <div style={{ flex: 1, fontSize: 12.5 }}>
                          <strong>Monthly Reflection Due!</strong> It has been {daysSinceAssessment} days since your last assessment. Tap below to reflect on your shopping habits.
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      className={`btn ${isCooldownActive ? 'btn-g' : 'btn-p'}`} 
                      disabled={isCooldownActive}
                      title={isCooldownActive ? `Cooldown active for ${daysRemaining} more days` : 'Retake BSAS'}
                      onClick={() => {
                        setBsasI(0);
                        setBsasAns({});
                        setView('bsasIntro');
                      }}
                    >
                      {isCooldownActive ? `Retake BSAS (${daysRemaining}d Cooldown)` : 'Retake Monthly BSAS Reflection'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                      onClick={() => {
                        setSimulatedDaysOffset(prev => prev >= 30 ? 0 : 31);
                        toast(simulatedDaysOffset >= 30 ? 'Cooldown simulation reset to real dates' : 'Fast-forwarded 31 days: Monthly retake is now due!');
                      }}
                    >
                      {simulatedDaysOffset >= 30 ? '↺ Reset Real Cooldown' : '⏩ Simulate 30d Elapsed (Test Monthly Retake)'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4.2.3 Least Worn Clothing Prompt (Automated Rotation Nudge) */}
            {analytics.unwornList.length > 0 && (
              <div className="card" style={{ background: 'rgba(217, 119, 6, 0.08)', border: '1px solid #d97706', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5, color: '#92400e', display: 'block' }}>
                      Wardrobe Rotation Prompt: {analytics.unwornList.length} Neglected Garment{analytics.unwornList.length === 1 ? '' : 's'}
                    </strong>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px', lineHeight: 1.4 }}>
                      These pieces currently have zero recorded wears. Re-activate your closet by adding one to today&apos;s outfit log or offering it to friends!
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {analytics.unwornList.slice(0, 4).map(item => (
                        <button 
                          key={item.item_id}
                          type="button" 
                          className="btn btn-g"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => handleToggleTodayOutfitItem(item)}
                        >
                          + Log {item.name} Today
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UN SDG 12 Conscious Wardrobe Utilization Card */}
            <div className="card">
              <strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>UN SDG 12 Conscious Consumption Analytics</strong>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                Responsible consumption and active rotation of clothing items you own
              </div>

              <div className="card text-center" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                  {analytics.utilizationRate}%
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  Wardrobe Utilization Rate ({analytics.wornItems} of {analytics.totalItems} clothing items worn)
                </div>
              </div>

              {/* Most Worn Clothing Items - only show if there are clothing items actually worn */}
              {actuallyWornItems.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <strong style={{ fontSize: 13.5 }}>Most Worn Clothing Items</strong>
                  <div style={{ marginTop: 8 }}>
                    {actuallyWornItems.map(item => {
                      const isColor = (item.color_tag || item.image_url || '#3E6B45').startsWith('#');
                      return (
                        <div key={item.item_id} className="row">
                          <span 
                            className="swatchsm" 
                            style={isColor ? { background: item.color_tag || item.image_url || '#3E6B45', margin: 0 } : { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', margin: 0 }} 
                          />
                          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{item.name}</span>
                          <span className="pill on">{item.worn_count ?? item.wear_count ?? 0} wears</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unworn / Forgotten Clothing Items */}
              <div style={{ marginTop: 14 }}>
                <strong style={{ fontSize: 13.5 }}>Unworn / Forgotten Clothing Items ({analytics.unwornList.length})</strong>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Clothing items with zero recorded wears. Consider styling them or sharing with friends!
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {analytics.unwornList.map(item => (
                    <span key={item.item_id} className="pill">
                      {item.name}
                    </span>
                  ))}
                  {analytics.unwornList.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Great job! Every piece in your closet has been worn!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // NOTIFICATIONS
      // -----------------------------------------------------------------------
      case 'notifications':
        const incomingPendingFriends = friendRequests.filter(r => r.receiver_id === currentUser?.user_id && r.status === 'pending');

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Notifications</h2>
              {notifications.length > 0 && (
                <button 
                  className="btn btn-g" 
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setNotifications([])}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Urgent / Actionable Friend Request Banners inside Notifications */}
            {incomingPendingFriends.map(req => {
              const sender = req.sender || allUsers.find(u => u.user_id === req.sender_id);
              return (
                <div key={req.request_id} className="card" style={{ border: '2px solid var(--primary)', background: 'var(--surface-2)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: 'var(--primary)', color: '#fff' }}>
                      {initials(sender ? `${sender.first_name} ${sender.last_name}` : 'Friend')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pill on" style={{ fontSize: 10, padding: '1px 6px' }}>ACTION REQUIRED</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Incoming Request</span>
                      </div>
                      <strong style={{ fontSize: 14, display: 'block', marginTop: 2 }}>
                        {sender?.first_name || 'Friend'} sent a friend request to {currentUser?.first_name || 'you'}
                      </strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Friend Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sender?.friend_code}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        className="btn btn-p" 
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={() => handleAcceptFriend(req.request_id, sender?.first_name)}
                      >
                        Accept
                      </button>
                      <button 
                        className="btn btn-g" 
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleRejectFriend(req.request_id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="card">
              {notifications.map(n => (
                <div key={n.id} className="row">
                  {n.type === 'borrow' ? (
                    <CheckCircle className="ico" style={{ color: 'var(--primary)' }} />
                  ) : n.type === 'streak' ? (
                    <Leaf className="ico" style={{ color: 'var(--primary)' }} />
                  ) : (
                    <HeartHandshake className="ico" style={{ color: 'var(--primary)' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5 }}>{n.title}</strong>
                    {n.message && <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{n.message}</div>}
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && incomingPendingFriends.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    color: 'var(--text-muted)'
                  }}>
                    <Bell style={{ width: 22, height: 22 }} />
                  </div>
                  <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>No notifications yet</strong>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                    Updates on friend requests, borrow requests, and closet milestones will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // FRIENDS (5.1.1, 5.1.2, 5.1.3)
      // -----------------------------------------------------------------------
      case 'friends':
        const incomingReqs = friendRequests.filter(r => r.receiver_id === currentUser?.user_id && r.status === 'pending');
        const outgoingReqs = friendRequests.filter(r => r.sender_id === currentUser?.user_id && r.status === 'pending');
        const otherDemoUser = allUsers.find(u => u.user_id !== currentUser?.user_id);

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Friends &amp; Shared Closets</h2>
              <button 
                className="btn btn-p"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setModal('friendCode')}
              >
                + Add Friend by Code
              </button>
            </div>

            {/* 5.1.1 Personal Friend Code & Quick Switch Bar */}
            <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Your Unique Friend Code
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <code style={{ fontSize: 16, fontWeight: 700, background: 'var(--surface)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      {currentUser?.friend_code || 'RP-USER-0000'}
                    </code>
                    <button 
                      type="button" 
                      className="btn btn-g"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => {
                        if (currentUser?.friend_code) {
                          navigator.clipboard?.writeText(currentUser.friend_code);
                          toast(`Copied ${currentUser.friend_code} to clipboard!`);
                        }
                      }}
                    >
                      📋 Copy Code
                    </button>
                  </div>
                </div>

                {/* 1-Click Profile Switcher for Testing (Mario <-> Liu) */}
                {otherDemoUser && (
                  <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Testing Multi-Account?</div>
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 11.5, padding: '4px 10px', marginTop: 3 }}
                      onClick={() => handleQuickSwitchUser(otherDemoUser.user_id)}
                    >
                      ⚡ Switch to {otherDemoUser.first_name} ({otherDemoUser.friend_code})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prominent Notification Banner for Incoming Friend Requests */}
            {incomingReqs.map(req => {
              const sender = req.sender || allUsers.find(u => u.user_id === req.sender_id);
              return (
                <div 
                  key={req.request_id} 
                  className="card" 
                  style={{ 
                    border: '2px solid var(--primary)', 
                    background: 'rgba(62, 107, 69, 0.08)', 
                    marginBottom: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ background: 'var(--primary)', color: '#fff', width: 44, height: 44, fontSize: 15 }}>
                      {initials(sender ? `${sender.first_name} ${sender.last_name}` : 'Friend')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pill on" style={{ fontSize: 10, padding: '2px 6px' }}>NEW FRIEND REQUEST</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Pending Response</span>
                      </div>
                      <strong style={{ fontSize: 15, display: 'block', marginTop: 2 }}>
                        {sender?.first_name || 'A user'} sent a friend request to {currentUser?.first_name || 'you'}!
                      </strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        Friend Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sender?.friend_code}</span> &middot; {sender?.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        type="button"
                        className="btn btn-p" 
                        style={{ padding: '7px 16px', fontSize: 13 }}
                        onClick={() => handleAcceptFriend(req.request_id, sender?.first_name)}
                      >
                        Accept Request
                      </button>
                      <button 
                        type="button"
                        className="btn btn-g" 
                        style={{ padding: '7px 14px', fontSize: 13 }}
                        onClick={() => handleRejectFriend(req.request_id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Outgoing Pending Friend Requests */}
            {outgoingReqs.length > 0 && (
              <div className="card" style={{ marginBottom: 14, background: 'var(--surface-2)' }}>
                <strong style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>
                  Outgoing Requests ({outgoingReqs.length} Pending)
                </strong>
                {outgoingReqs.map(req => {
                  const receiver = req.receiver || allUsers.find(u => u.user_id === req.receiver_id);
                  return (
                    <div key={req.request_id} className="row">
                      <div className="avatar">{initials(receiver ? `${receiver.first_name} ${receiver.last_name}` : 'User')}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{receiver?.first_name} {receiver?.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Code: {receiver?.friend_code}</div>
                      </div>
                      <span className="pill" style={{ background: 'var(--surface-3)', fontSize: 11 }}>
                        ⏳ Waiting for {receiver?.first_name} to accept
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Connected Friends List */}
            <div className="card">
              <strong style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>
                Connected Friends ({friends.length})
              </strong>

              {friends.map(f => {
                const friendItems = friendsService.getFriendCloset(f.user_id);
                return (
                  <div key={f.user_id} className="row">
                    <div className="avatar">{initials(`${f.first_name} ${f.last_name}`)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 14 }}>{f.first_name} {f.last_name}</strong>
                        <span className="pill on" style={{ fontSize: 10, padding: '1px 5px' }}>✓ Connected</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Code: {f.friend_code} &middot; {friendItems.length} items in shared closet
                      </div>
                    </div>
                    <button 
                      className="btn btn-g" 
                      onClick={() => {
                        setFriendSel(f);
                        setView('friendCloset');
                      }}
                    >
                      View closet
                    </button>
                  </div>
                );
              })}

              {friends.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    color: 'var(--text-muted)'
                  }}>
                    <Users style={{ width: 22, height: 22 }} />
                  </div>
                  <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>No friends connected yet</strong>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 auto 14px', maxWidth: 300 }}>
                    Exchange your unique friend code to share closets, borrow garments, and cultivate mindful circular fashion.
                  </p>
                  <button 
                    className="btn btn-p"
                    style={{ fontSize: 13 }}
                    onClick={() => setModal('friendCode')}
                  >
                    + Add Friend by Code
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // FRIEND CLOSET
      // -----------------------------------------------------------------------
      case 'friendCloset':
        if (!friendSel) return null;
        const friendItems = friendsService.getFriendCloset(friendSel.user_id);

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button 
                className="btn btn-g" 
                style={{ padding: '4px 10px' }} 
                onClick={() => setView('friends')}
              >
                ← Back
              </button>
              <h2>{friendSel.first_name}&apos;s Closet</h2>
            </div>

            <div className="grid">
              {friendItems.map(g => {
                const imgs = g.images && g.images.length ? g.images : [g.color_tag || g.image_url || '#3E6B45'];
                return (
                  <div key={g.item_id} className="gcard">
                    <div className="gimgs">
                      {imgs.map((imgSrc, idx) => {
                        const isColor = imgSrc.startsWith('#');
                        return (
                          <div 
                            key={idx} 
                            style={isColor ? { background: imgSrc } : { backgroundImage: `url(${imgSrc})` }}
                          >
                            {isColor && <span>Photo {idx + 1}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="badge-av">{initials(friendSel.first_name)}</div>
                    <div className="gbody">
                      <strong style={{ fontSize: 13 }}>{g.name}</strong>
                      <div>
                        {[g.type_tag || g.category].filter(Boolean).map(t => (
                          <span key={t} className="pill">{t}</span>
                        ))}
                      </div>
                      <button 
                        className="btn btn-p" 
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                        onClick={() => {
                          setBorrowCtx({
                            friendName: `${friendSel.first_name} ${friendSel.last_name}`,
                            friendId: friendSel.user_id,
                            item: g
                          });
                          setView('borrow');
                        }}
                      >
                        Borrow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // REQUEST TO BORROW
      // -----------------------------------------------------------------------
      case 'borrow':
        if (!currentUser) return null;
        const ctx = borrowCtx || {
          friendName: 'Alex Tran',
          friendId: 'u-alex-03',
          item: garments[0] || { name: 'Item', item_id: 1 }
        };

        const myBorrows = borrows.filter(b => b.borrower_id === currentUser.user_id);

        return (
          <div>
            <h2>Request to Borrow</h2>
            <div className="card">
              <strong>{ctx.item.name}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                From {ctx.friendName}
              </div>
            </div>

            <form onSubmit={handleBorrowSubmit}>
              <div className="field">
                <label>Date to borrow</label>
                <input type="date" name="from" required defaultValue={todayStr()} />
              </div>
              <div className="field">
                <label>Date to return</label>
                <input type="date" name="to" required defaultValue={todayStr()} />
              </div>
              <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center' }}>
                Send request
              </button>
            </form>

            <h3 style={{ marginTop: 22 }}>My borrow requests</h3>
            <div className="card">
              {myBorrows.map(r => {
                const targetItem = mockDatabase.getItemById(r.item_id);
                const lender = allUsers.find(u => u.user_id === targetItem?.user_id);
                const isApproved = r.status === 'Accepted' || (r.status as string) === 'approved';

                return (
                  <div key={r.borrow_id} className="row">
                    <div className="avatar">{initials(lender ? `${lender.first_name} ${lender.last_name}` : 'Friend')}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13.5 }}>{targetItem?.name || 'Garment'}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.start_date} – {r.end_date} · {lender ? `${lender.first_name} ${lender.last_name}` : 'Friend'}
                      </div>
                    </div>
                    <span className="pill on">
                      {r.status.toUpperCase()}
                    </span>
                    {(isApproved || r.status === 'Pending') && (
                      <button 
                        className="btn btn-g" 
                        style={{ padding: '5px 10px', marginLeft: 6 }}
                        onClick={() => handleCancelBorrow(r.borrow_id, r.start_date)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}

              {myBorrows.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active borrow requests.</p>
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // REQUESTS (Tabs: Your Requests / Friends Requests)
      // -----------------------------------------------------------------------
      case 'requests':
        if (!currentUser) return null;
        const outgoing = borrows.filter(b => b.borrower_id === currentUser.user_id);
        const incoming = borrows.filter(b => {
          const item = mockDatabase.getItemById(b.item_id);
          return item && item.user_id === currentUser.user_id;
        });

        return (
          <div>
            <h2>Requests</h2>
            <div className="tabs">
              <button 
                className={reqTab === 'yours' ? 'active' : ''} 
                onClick={() => setReqTab('yours')}
              >
                Your Requests
              </button>
              <button 
                className={reqTab === 'friends' ? 'active' : ''} 
                onClick={() => setReqTab('friends')}
              >
                Friends Requests {incoming.filter(r => r.status === 'Pending').length > 0 && `(${incoming.filter(r => r.status === 'Pending').length})`}
              </button>
            </div>

            {reqTab === 'yours' ? (
              <div className="card">
                {outgoing.map(r => {
                  const itm = mockDatabase.getItemById(r.item_id);
                  const lender = allUsers.find(u => u.user_id === itm?.user_id);
                  return (
                    <div key={r.borrow_id} className="row">
                      <div className="avatar">{initials(lender ? `${lender.first_name} ${lender.last_name}` : 'Friend')}</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5 }}>{itm?.name || 'Garment'}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {r.start_date} – {r.end_date}
                        </div>
                      </div>
                      <span className="pill on">STATUS: {r.status.toUpperCase()}</span>
                    </div>
                  );
                })}
                {outgoing.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No outgoing requests.</p>
                )}
              </div>
            ) : (
              <div className="card">
                {incoming.map(r => {
                  const borrower = allUsers.find(u => u.user_id === r.borrower_id);
                  const itm = mockDatabase.getItemById(r.item_id);
                  const isPending = r.status === 'Pending';

                  return (
                    <div key={r.borrow_id} className="row">
                      <div className="avatar">{initials(borrower ? `${borrower.first_name} ${borrower.last_name}` : 'User')}</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5 }}>{borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Friend'}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          wants to borrow {itm?.name || 'Garment'} · {r.start_date} – {r.end_date}
                        </div>
                      </div>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            className="btn btn-p" 
                            style={{ padding: '6px 12px' }}
                            onClick={() => handleRespondBorrow(r.borrow_id, 'Accepted')}
                          >
                            Accept
                          </button>
                          <button 
                            className="btn btn-g" 
                            style={{ padding: '6px 12px' }}
                            onClick={() => handleRespondBorrow(r.borrow_id, 'Rejected')}
                          >
                            Deny
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`pill ${r.status === 'Accepted' ? 'on' : r.status === 'Returned' ? 'on' : ''}`}>
                            {r.status === 'Returned' ? '✓ Returned' : r.status}
                          </span>
                          {r.status === 'Accepted' && (
                            <button
                              type="button"
                              className="btn btn-g"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              onClick={() => handleRespondBorrow(r.borrow_id, 'Returned')}
                              title="Confirm borrower has returned the garment"
                            >
                              Mark as Returned
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {incoming.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No incoming requests.</p>
                )}
              </div>
            )}
          </div>
        );

      // -----------------------------------------------------------------------
      // DONATION OPTIONS (Google Maps Integration)
      // -----------------------------------------------------------------------
      case 'donations':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Donation Options &amp; Drop-off Map</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {opportunities.length} drop-off locations
              </span>
            </div>

            <DonationMapSection
              opportunities={opportunities}
              currentUserLocation={null}
              onRefreshData={loadData}
              toast={toast}
              highlightId={donHighlight}
              setHighlightId={setDonHighlight}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // PROFILE
      // -----------------------------------------------------------------------
      case 'profile':
        if (!currentUser) return null;
        return (
          <div>
            <h2>Profile</h2>
            <div className="card" style={{ textAlign: 'center' }}>
              <div 
                className="avatar" 
                style={{ margin: '0 auto 8px', width: 64, height: 64, fontSize: 20 }}
              >
                {initials(`${currentUser.first_name} ${currentUser.last_name}`)}
              </div>
              <h3 style={{ fontStyle: 'italic', marginBottom: 2 }}>
                {currentUser.first_name} {currentUser.last_name}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Friend Code: <strong className="font-mono text-emerald-800">{currentUser.friend_code}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '14px 0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{garments.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Items</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{friends.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Friends</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{todayLog.is_finalized ? 1 : 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Day streak</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                <button 
                  className="btn btn-g"
                  onClick={() => setModal('editProfile')}
                >
                  Edit Profile
                </button>
                <button 
                  className="btn btn-g"
                  onClick={() => toast('Password update modal placeholder')}
                >
                  Change Password
                </button>
                <button 
                  className="btn btn-g" 
                  onClick={() => setView('recovery')}
                >
                  <Leaf className="ico" /> Recovery &amp; SDG 12
                </button>
                <button 
                  className="btn btn-g" 
                  onClick={() => setView('requests')}
                >
                  Requests
                </button>
                <button 
                  className="btn btn-g"
                  onClick={() => {
                    navigator.clipboard?.writeText(currentUser.friend_code);
                    toast(`Friend code ${currentUser.friend_code} copied to clipboard!`);
                  }}
                >
                  <Copy className="ico" /> Copy Friend Code
                </button>
                <button 
                  className="btn btn-d" 
                  onClick={handleDeleteAccountFlow}
                >
                  Delete Account
                </button>
              </div>
            </div>

            {/* Profile Virtual Closet Display without wear counts */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>My Virtual Closet</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {garments.length} clothing {garments.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {garments.length > 0 ? (
                <div className="grid">
                  {garments.map(item => {
                    const imgs = item.images && item.images.length ? item.images : [item.color_tag || item.image_url || '#3E6B45'];
                    return (
                      <div key={item.item_id} className="gcard">
                        <div className="gimgs">
                          {imgs.map((imgSrc, i) => {
                            const isColor = imgSrc.startsWith('#');
                            return (
                              <div 
                                key={i} 
                                style={isColor ? { background: imgSrc } : { backgroundImage: `url(${imgSrc})` }}
                              >
                                {isColor && <span>Photo {i + 1}</span>}
                              </div>
                            );
                          })}
                        </div>
                        {imgs.length > 1 && (
                          <div className="gdots">
                            {imgs.map((_, i) => (
                              <span key={i}></span>
                            ))}
                          </div>
                        )}
                        <div className="gbody">
                          <strong style={{ fontSize: 13.5 }}>{item.name}</strong>
                          <div style={{ marginTop: 4 }}>
                            {[item.type_tag || item.category].filter(Boolean).map(t => (
                              <span key={t} className="pill">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                    No clothing items in your closet yet. Tap &apos;Virtual Closet&apos; to add one!
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // SETTINGS
      // -----------------------------------------------------------------------
      case 'settings':
        return (
          <div>
            <h2>Settings</h2>
            <div className="card">
              <strong style={{ fontSize: 13 }}>Appearance</strong>
              <div className="row" style={{ marginTop: 6 }}>
                <span style={{ flex: 1 }}>Dark mode</span>
                <span 
                  className={`switch ${theme === 'dark' ? 'on' : ''}`} 
                  onClick={toggleTheme}
                />
              </div>

              <strong style={{ fontSize: 13, display: 'block', marginTop: 16 }}>Notifications</strong>
              <div className="row">
                <span style={{ flex: 1 }}>Borrow requests</span>
                <span 
                  className={`switch ${notifPrefs.borrowRequests ? 'on' : ''}`}
                  onClick={() => setNotifPrefs(p => ({ ...p, borrowRequests: !p.borrowRequests }))}
                />
              </div>
              <div className="row">
                <span style={{ flex: 1 }}>Recovery milestones</span>
                <span 
                  className={`switch ${notifPrefs.recoveryMilestones ? 'on' : ''}`}
                  onClick={() => setNotifPrefs(p => ({ ...p, recoveryMilestones: !p.recoveryMilestones }))}
                />
              </div>
              <div className="row">
                <span style={{ flex: 1 }}>Donation drives near me</span>
                <span 
                  className={`switch ${notifPrefs.donationDrives ? 'on' : ''}`}
                  onClick={() => setNotifPrefs(p => ({ ...p, donationDrives: !p.donationDrives }))}
                />
              </div>

              {/* Database & Cloud Connection Drawer */}
              <strong style={{ fontSize: 13, display: 'block', marginTop: 16 }}>Cloud Database</strong>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Supabase Configuration</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Connect remote PostgreSQL instance or inspect normalized SQL tables
                  </div>
                </div>
                <button 
                  className="btn btn-g"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setIsDatabaseModalOpen(true)}
                >
                  <Database className="ico" /> Manage
                </button>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // DAILY LOG (Module 3.0 Daily Clothing Usage)
      // -----------------------------------------------------------------------
      case 'daily-log':
        const selectedToday = todayLog.items || [];
        const pastLogs = mockDatabase.getDailyLogs().filter(l => l.log_date !== todayLog.log_date);

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Daily Clothing Usage &amp; Outfit Builder</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Log what you wear daily &middot; Automated midnight finalization at 00:00
                </span>
              </div>
              <button 
                className="btn btn-g" 
                onClick={() => setView('closet')}
              >
                ← Back to Closet
              </button>
            </div>

            {/* Daily Wear Status Card */}
            <div className="card" style={{ 
              border: todayLog.is_finalized ? '1px solid var(--border)' : '1px solid var(--primary)', 
              background: todayLog.is_finalized ? 'var(--surface-2)' : 'var(--surface)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>Today&apos;s Date: {todayLog.log_date}</strong>
                    {todayLog.is_finalized ? (
                      <span className="pill on" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                        🔒 Locked &amp; Finalized (Edits Frozen)
                      </span>
                    ) : (
                      <span className="pill" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                        ✏️ Open for Edits (Calendar Day)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    {todayLog.is_finalized
                      ? `Finalized at ${todayLog.finalized_at ? new Date(todayLog.finalized_at).toLocaleTimeString() : '00:00 midnight'}. Garment wear counts have been incremented.`
                      : 'You can freely modify or delete your outfit throughout today. Automated midnight job locks log at 00:00.'}
                  </div>
                </div>

                {/* 3.2 & 3.3 Daily Wear Action Buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!todayLog.is_finalized && (
                    <>
                      <button 
                        type="button"
                        className="btn btn-p" 
                        onClick={handleFinalizeTodayLog}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        ✓ Finalize Now
                      </button>
                      <button 
                        type="button"
                        className="btn btn-g" 
                        onClick={handleDeleteTodayLog}
                        disabled={selectedToday.length === 0}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        title="Delete / clear today's wear log"
                      >
                        ✕ Clear / Delete Log
                      </button>
                      <button 
                        type="button"
                        className="btn btn-g" 
                        onClick={handleSimulateMidnight}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        title="Simulate 00:00 automated pg_cron job / edge trigger locking"
                      >
                        🕛 Simulate 00:00 Midnight Job
                      </button>
                    </>
                  )}
                  {todayLog.is_finalized && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
                      Log locked for the day
                    </span>
                  )}
                </div>
              </div>

              {/* Selected Items Strip */}
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <strong>Garments in Today&apos;s Outfit ({selectedToday.length}):</strong>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {selectedToday.map(i => (
                    <span 
                      key={i.item_id} 
                      className="pill on"
                      style={{ 
                        cursor: todayLog.is_finalized ? 'default' : 'pointer',
                        padding: '4px 10px',
                        fontSize: 12
                      }}
                      onClick={() => !todayLog.is_finalized && handleToggleTodayOutfitItem(i)}
                      title={todayLog.is_finalized ? 'Finalized (Frozen)' : 'Click to remove'}
                    >
                      {i.name} {!todayLog.is_finalized && '✕'}
                    </span>
                  ))}
                  {selectedToday.length === 0 && (
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      No garments selected for today yet. Tap items from your closet below!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3.1 Visual Outfit Builder from Virtual Closet */}
            <h3 style={{ marginTop: 20, marginBottom: 8 }}>
              {todayLog.is_finalized ? "Today's Outfit (Edits Frozen)" : "Tap Garments to Compose Today's Outfit"}
            </h3>
            
            <div className="grid">
              {garments.map(g => {
                const isSelected = selectedToday.some(i => i.item_id === g.item_id);
                const isColor = (g.color_tag || g.image_url || '#3E6B45').startsWith('#');

                return (
                  <div 
                    key={g.item_id} 
                    className={`gcard ${isSelected ? 'border-2 border-emerald-600 shadow-md' : ''}`}
                    style={{ 
                      cursor: todayLog.is_finalized ? 'not-allowed' : 'pointer',
                      opacity: todayLog.is_finalized && !isSelected ? 0.55 : 1.0,
                      transform: isSelected ? 'scale(1.02)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleToggleTodayOutfitItem(g)}
                  >
                    <div style={{ 
                      height: 100, 
                      background: isColor ? (g.color_tag || g.image_url || '#3E6B45') : undefined,
                      backgroundImage: !isColor ? `url(${g.image_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#fff', 
                      fontSize: 12, 
                      fontWeight: 700,
                      textShadow: !isColor ? '0 1px 3px rgba(0,0,0,0.8)' : undefined
                    }}>
                      {isSelected ? '✓ IN TODAY\'S OUTFIT' : g.name}
                    </div>
                    <div className="gbody">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 13 }}>{g.name}</strong>
                        <span className="pill" style={{ fontSize: 10 }}>
                          {g.addition_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {g.worn_count ?? g.wear_count ?? 0}× total wear{g.wear_count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Past Daily Wear Logs History */}
            {pastLogs.length > 0 && (
              <div style={{ marginTop: 26 }}>
                <h3>Past Daily Wear Logs ({pastLogs.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pastLogs.map(pl => (
                    <div key={pl.log_id} className="card" style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{pl.log_date}</strong>
                          <span className="pill on" style={{ marginLeft: 8, fontSize: 10.5 }}>✓ Finalized</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {pl.items?.length || 0} items worn
                        </span>
                      </div>
                      {pl.items && pl.items.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {pl.items.map(it => (
                            <span key={it.item_id} className="pill" style={{ fontSize: 11 }}>
                              {it.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  /* ================= SHELL RENDER ================= */
  return (
    <div className="shell">
      {/* Mobile Drawer Scrim */}
      <div 
        className={`scrim ${sideOpen ? 'show' : ''}`} 
        onClick={() => setSideOpen(false)}
      />

      {/* Sidebar Navigation */}
      <nav className={`side ${sideOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="dot">R</span>
          <span>ReApparel</span>
        </div>

        {NAV_ITEMS.map(n => {
          const Icon = n.icon;
          const isActive = view === n.id || 
            (n.id === 'friends' && view === 'friendCloset') ||
            (n.id === 'closet' && (view === 'daily-log' || view === 'analytics'));
          
          const badgeCount = n.id === 'notifications' ? notifications.length : 0;

          return (
            <button
              key={n.id}
              className={`navitem ${isActive ? 'active' : ''}`}
              onClick={() => {
                setView(n.id);
                setSideOpen(false);
              }}
            >
              <Icon className="ico" />
              <span>{n.label}</span>
              {badgeCount > 0 ? <span className="badge">{badgeCount}</span> : null}
            </button>
          );
        })}

        <button 
          className="logout" 
          onClick={() => {
            mockDatabase.setCurrentUserId(null);
            setCurrentUser(null);
            setView('login');
            setSideOpen(false);
            toast('Logged out successfully');
          }}
        >
          <LogOut className="ico" /> Log out
        </button>
      </nav>

      {/* Main View Area */}
      <div className="main">
        {/* Sticky Mobile Top Header */}
        <div className="top">
          <button 
            className="icobtn" 
            onClick={() => setSideOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="ico" />
          </button>
          <strong style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17 }}>
            {(NAV_ITEMS.find(n => n.id === view) || {}).label || 'ReApparel'}
          </strong>
          <button 
            className="icobtn" 
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="ico" /> : <Moon className="ico" />}
          </button>
        </div>

        {/* Content View */}
        <div className="content">
          {renderContent()}
        </div>

        {/* Desktop & Mobile Scroll Footer */}
        <footer className="app-footer" id="siteFooter">
          <div>
            <strong style={{ fontFamily: 'var(--font-display)' }}>ReApparel</strong>
            <div style={{ marginTop: 2 }}>
              A mindful home for your closet &middot; Responsible consumption &amp; circular fashion.
            </div>
          </div>
          <a href="#" onClick={(e) => { e.preventDefault(); toast('ReApparel complies with UN SDG 12 data ethics.'); }}>
            Privacy Policy
          </a>
        </footer>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Add / Edit Clothing Item Modal */}
      {modal === 'garmentForm' && (
        <div 
          className="modalScrim" 
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal">
            <h3>{editId ? 'Edit clothing item' : 'Add clothing item'}</h3>
            
            <div className="field">
              <label>Photos (1–3)</label>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {editImages.map((imgSrc, idx) => {
                  const isColor = imgSrc.startsWith('#');
                  return (
                    <span 
                      key={idx} 
                      className="swatchsm" 
                      style={isColor ? { background: imgSrc } : { backgroundImage: `url(${imgSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                      {isColor ? idx + 1 : ''}
                      <span 
                        className="x" 
                        onClick={() => removePreviewImage(idx)}
                        title="Remove image"
                      >
                        ✕
                      </span>
                    </span>
                  );
                })}
              </div>

              {/* Upload image file directly */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={handleImageUpload} 
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <button 
                  type="button" 
                  className="btn btn-g"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={editImages.length >= 3}
                >
                  <Upload className="ico" style={{ width: 14, height: 14 }} /> Upload Image
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {editImages.length}/3 photos
                </span>
              </div>
            </div>

            <form onSubmit={saveGarmentForm}>
              <div className="field">
                <label>Name</label>
                <input 
                  name="name" 
                  placeholder="e.g. Vintage Linen Overshirt"
                  defaultValue={garments.find(x => x.item_id === editId)?.name || ''} 
                  required 
                />
              </div>

              {/* 2.1.3 Baseline tag: Mark garment as "Old" (pre-existing) or "New" (recent purchase) */}
              <div className="field">
                <label>Baseline Addition Type (Requirement 2.1.3)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: editAdditionType === 'Old' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: editAdditionType === 'Old' ? 'rgba(62, 107, 69, 0.08)' : 'var(--surface)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="addition_type_radio" 
                      checked={editAdditionType === 'Old'} 
                      onChange={() => setEditAdditionType('Old')} 
                    />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>🌿 Old Garment</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pre-existing wardrobe</span>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: editAdditionType === 'New' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: editAdditionType === 'New' ? 'rgba(62, 107, 69, 0.08)' : 'var(--surface)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="addition_type_radio" 
                      checked={editAdditionType === 'New'} 
                      onChange={() => setEditAdditionType('New')} 
                    />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>✨ New Purchase</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recent purchase</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2.1.2 Tagging workflow: Assign one or more categories */}
              <div className="field">
                <label>Categories (Assign one or more from TAG catalog)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Dresses', 'Knitwear', 'Accessories'].map(cat => {
                    const isSel = editCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`pill ${isSel ? 'on' : ''}`}
                        style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12, border: 'none' }}
                        onClick={() => {
                          if (isSel) {
                            if (editCategories.length > 1) {
                              setEditCategories(editCategories.filter(c => c !== cat));
                            }
                          } else {
                            setEditCategories([...editCategories, cat]);
                          }
                        }}
                      >
                        {cat} {isSel ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="type_tag" value={editCategories[0] || 'Tops'} />
              </div>

              {/* 2.1.2 Primary curated color family from the TAG catalog - Required */}
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>
                    Primary Curated Color Family <strong style={{ color: '#dc2626' }}>* (Required)</strong>
                  </span>
                  {editColorName ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: editColor, display: 'inline-block' }} />
                      {editColorName}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Please pick a color</span>
                  )}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
                  {CURATED_COLOR_FAMILIES.map(cf => {
                    const isSelected = editColor.toLowerCase() === cf.hex.toLowerCase() || editColorName.toLowerCase() === cf.name.toLowerCase();
                    return (
                      <button
                        key={cf.name}
                        type="button"
                        onClick={() => {
                          setEditColor(cf.hex);
                          setEditColorName(cf.name);
                          if (editImages.length === 0 || (editImages.length === 1 && editImages[0].startsWith('#'))) {
                            setEditImages([cf.hex]);
                          }
                          setEditFormWarn(null);
                        }}
                        style={{
                          background: cf.hex,
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          border: isSelected ? '3px solid var(--text)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: isSelected ? '0 0 0 2px var(--primary)' : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s'
                        }}
                        title={`${cf.name} (${cf.hex})`}
                      >
                        {isSelected && (
                          <span style={{
                            color: ['White', 'Yellow', 'Beige'].includes(cf.name) ? '#000000' : '#ffffff',
                            fontSize: 14,
                            fontWeight: 900
                          }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                    <input 
                      type="color" 
                      name="color_tag"
                      value={editColor || '#3E6B45'} 
                      onChange={(e) => {
                        setEditColor(e.target.value);
                        setEditColorName('Custom');
                        if (editImages.length === 0 || (editImages.length === 1 && editImages[0].startsWith('#'))) {
                          setEditImages([e.target.value]);
                        }
                        setEditFormWarn(null);
                      }}
                      style={{ width: 34, height: 28, padding: 0, cursor: 'pointer', verticalAlign: 'middle', borderRadius: 4 }}
                      title="Custom color picker"
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {editColor || 'None selected'}
                    </span>
                  </div>
                </div>
                {!editColor && (
                  <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 5 }}>
                    ⚠️ Color selection is required to submit clothing items.
                  </div>
                )}
              </div>

              {editFormWarn && (
                <div className="warn" style={{ marginBottom: 12 }}>
                  {editFormWarn}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {editId && (
                  <button 
                    type="button" 
                    className="btn btn-d" 
                    onClick={() => {
                      const target = garments.find(x => x.item_id === editId);
                      if (target) {
                        setDeleteCascadeModalGarment(target);
                      }
                    }}
                  >
                    Delete Item
                  </button>
                )}
                <button 
                  type="submit" 
                  className="btn btn-p" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {editId ? 'Save Garment' : 'Add to Closet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2.3 Deletion Modal with Cascade Protection */}
      {deleteCascadeModalGarment && (
        <div 
          className="modalScrim" 
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteCascadeModalGarment(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', marginBottom: 8 }}>
              <ShieldCheck style={{ width: 22, height: 22 }} />
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Cascade Protection Notice</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: '8px 0 12px' }}>
              Are you sure you want to delete <strong>{deleteCascadeModalGarment.name}</strong> from your closet?
            </p>
            <div className="warn" style={{ fontSize: 12, marginBottom: 14, textAlign: 'left' }}>
              <strong>Cascade Integrity Protection:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
                <li>Associated category and curated color tags will be safely unlinked.</li>
                <li>Garment will be removed from today&apos;s unfinalized daily wear logs.</li>
                <li>Any pending friend borrow requests on this garment will be cleanly cancelled.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                type="button" 
                className="btn btn-g" 
                style={{ flex: 1, justifyContent: 'center' }} 
                onClick={() => setDeleteCascadeModalGarment(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-d" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={async () => {
                  const id = deleteCascadeModalGarment.item_id;
                  setDeleteCascadeModalGarment(null);
                  await deleteGarment(id);
                }}
              >
                Confirm Cascade Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Generic Confirmation Modal */}
      {modal === 'confirm' && (
        <div 
          className="modalScrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 360 }}>
            <p style={{ fontSize: 14, marginBottom: 16 }}>{confirmText}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-g" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setModal(null)}
              >
                No
              </button>
              <button 
                className="btn btn-d" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  if (confirmYes) confirmYes();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Friend by Friend Code Modal */}
      {modal === 'friendCode' && (
        <div 
          className="modalScrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 380 }}>
            <h3>Add Friend</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Enter your friend&apos;s unique ReApparel Friend Code (e.g., RP-ALEX-8319):
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const code = (fd.get('code') as string).trim();
              const res = friendsService.sendFriendRequest(code);
              toast(res.message);
              if (res.success) setModal(null);
            }}>
              <div className="field">
                <label>Friend Code</label>
                <input name="code" placeholder="RP-XXXX-0000" required />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button 
                  type="button" 
                  className="btn btn-g" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-p" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Profile Modal */}
      {modal === 'editProfile' && (
        <div 
          className="modalScrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 380 }}>
            <h3>Edit Profile</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!currentUser) return;
              const fd = new FormData(e.currentTarget);
              const first_name = fd.get('first_name') as string;
              const last_name = fd.get('last_name') as string;
              currentUser.first_name = first_name;
              currentUser.last_name = last_name;
              toast('Profile updated');
              setModal(null);
              loadData();
            }}>
              <div className="field">
                <label>First Name</label>
                <input name="first_name" defaultValue={currentUser?.first_name || ''} required />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input name="last_name" defaultValue={currentUser?.last_name || ''} required />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button 
                  type="button" 
                  className="btn btn-g" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-p" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Supabase Config Drawer Modal */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onConfigUpdated={() => {
          loadData();
          toast('Supabase configuration updated');
        }}
      />

      {/* Global Toast Pill Notification */}
      {toastMessage && (
        <div className="toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
