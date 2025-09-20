'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, Clock, CheckCircle, Circle, Loader2, Sparkles, AlertCircle, Monitor, XCircle, Info, X, PlayCircle, Settings } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = 'http://127.0.0.1:8000';

interface Video {
  id: number;
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  resolutions: string[];
  channel_name: string;
  downloaded: boolean;
  download_progress: number;
}

export default function Home() {
  const [step, setStep] = useState(1); // 1: Enter URL, 2: Show Videos, 3: Downloading
  const [channelUrl, setChannelUrl] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedResolution, setSelectedResolution] = useState('highest');
  const [contentType, setContentType] = useState<'videos' | 'shorts' | 'streams'>('videos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentChannels, setRecentChannels] = useState<Array<{url: string, name: string, videoCount: number, lastFetched: string}>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Videos');
  const [searchCategories, setSearchCategories] = useState<Array<{name: string, count: number}>>([]);
  const [downloadProgress, setDownloadProgress] = useState<any>({});
  const [channelName, setChannelName] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(12); // Show 12 videos per page
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  
  // Video Player States
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [videoQualities, setVideoQualities] = useState<string[]>(['720p']);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [videoStreamUrl, setVideoStreamUrl] = useState('');

  // Add notification function
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Remove notification manually
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Save recent channel to localStorage
  const saveRecentChannel = (url: string, name: string, videoCount: number) => {
    const recent = {
      url,
      name,
      videoCount,
      lastFetched: new Date().toISOString()
    };
    
    const existingRecents = JSON.parse(localStorage.getItem('recentChannels') || '[]');
    const filteredRecents = existingRecents.filter((r: any) => r.url !== url);
    const newRecents = [recent, ...filteredRecents].slice(0, 10); // Keep only 10 recent
    
    localStorage.setItem('recentChannels', JSON.stringify(newRecents));
    setRecentChannels(newRecents);
  };

  // Load recent channels from localStorage
  const loadRecentChannels = () => {
    const recents = JSON.parse(localStorage.getItem('recentChannels') || '[]');
    setRecentChannels(recents);
  };

  // Get unique channel names for categories
  const categories = ['All Videos', ...Array.from(new Set(videos.map(video => video.channel_name)))];

  // Filter videos based on search query and category
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.channel_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Videos' || 
                           video.channel_name === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Test backend connection
  const testBackend = async () => {
    try {
      console.log('🔍 Testing backend connection...');
      const response = await axios.get(`${API_BASE}/api/test`, { timeout: 5000 });
      console.log('✅ Backend response:', response.data);
      setBackendConnected(true);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      setBackendConnected(false);
      setError('Cannot connect to Python backend. Make sure youtube_api_server.py is running on port 8000.');
      return false;
    }
  };

  // Step 1: Fetch channel videos
  const fetchChannelVideos = async () => {
    if (!channelUrl.trim()) {
      setError('Please enter a channel URL');
      return;
    }
    
    setLoading(true);
    setError('');
    console.log('🔍 Fetching videos for:', channelUrl);
    
    try {
      // Test backend first
      const isConnected = await testBackend();
      if (!isConnected) return;

      // Clean the URL before sending - let backend handle URL format testing
      let cleanUrl = channelUrl.trim();
      
      console.log('Sending fetch request to backend...');
      console.log('Original URL:', channelUrl);
      console.log('Clean URL:', cleanUrl);
      
      const response = await axios.post(`${API_BASE}/api/fetch-channel`, {
        channel_url: cleanUrl,
        content_type: contentType
      }, {
        timeout: 120000 // 2 minute timeout for mega channels
      });
      
      console.log('✅ Fetch response:', response.data);
      
      if (response.data.success) {
        setVideos(response.data.videos);
        setChannelName(response.data.channel_name);
        setStep(2); // Move to video selection step
        
        // Save to recent channels
        saveRecentChannel(cleanUrl, response.data.channel_name, response.data.videos.length);
        
        // Auto-set category to the new channel if it's the first/only channel
        if (response.data.channel_name) {
          setSelectedCategory(response.data.channel_name);
        }
        
        console.log(`📹 Loaded ${response.data.videos.length} videos from ${response.data.channel_name}`);
        addNotification(`✅ Found ${response.data.videos.length} ${contentType} from ${response.data.channel_name}!`, 'success');
      }
    } catch (error: any) {
      console.error('❌ Error fetching channel:', error);
      if (error.code === 'ECONNREFUSED') {
        setError('Cannot connect to Python backend. Make sure youtube_api_server.py is running on port 8000.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to fetch channel videos');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
    console.log(`📌 Selected videos: ${newSelection.size}`);
  };

  // Select all videos
  const selectAllVideos = () => {
    const allVideoIds = videos.filter(v => !v.downloaded).map(v => v.video_id);
    setSelectedVideos(new Set(allVideoIds));
    console.log(`✅ Selected all ${allVideoIds.length} videos`);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedVideos(new Set());
    console.log('🗑️ Cleared selection');
  };

  // Download individual video directly to browser Downloads folder with Chrome progress
  const downloadVideoToBrowser = async (videoId: string, title: string) => {
    try {
      console.log(`🚀 Starting DIRECT browser download for: ${title}`);
      
      // Add to downloading list for UI feedback
      setDownloadingVideos(prev => new Set(prev).add(videoId));
      
      // Show immediate notification
      addNotification(`🔄 Preparing download for "${title}"...`, 'info');
      
      // Create direct download link with stream endpoint
      const downloadUrl = `${API_BASE}/api/stream-download/${videoId}?resolution=${selectedResolution}`;
      
      // Trigger direct browser download - this will show in Chrome's download progress!
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '_')}.mp4`;
      link.target = '_blank'; // Open in new tab to ensure download starts
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('🔥 Direct download triggered - check Chrome downloads!');
      
      // Remove from downloading list after a short delay (since download started)
      setTimeout(() => {
        setDownloadingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        
        // Show success notification
        addNotification(`🚀 "${title}" download started! Check your Chrome downloads tab for progress.`, 'success');
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error starting direct download:', error);
      addNotification(`❌ Failed to download "${title}": ${error.message || 'Unknown error'}`, 'error');
      
      // Remove from downloading list on error
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  // Download selected videos to browser Downloads folder (stays on same page)
  const downloadSelectedVideos = async () => {
    if (selectedVideos.size === 0) {
      addNotification('❌ Please select at least one video to download', 'error');
      return;
    }
    
    // Don't change step - stay on video selection page
    setError('');
    
    try {
      console.log(`⬇️ Starting download of ${selectedVideos.size} videos to browser Downloads folder`);
      
      addNotification(`🚀 Starting download of ${selectedVideos.size} videos...`, 'info');
      
      // Download each video individually to browser
      for (const videoId of Array.from(selectedVideos)) {
        const video = videos.find(v => v.video_id === videoId);
        if (video) {
          await downloadVideoToBrowser(videoId, video.title);
          // Small delay between downloads to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Clear selection after successful batch download
      setSelectedVideos(new Set());
      addNotification(`✅ All ${selectedVideos.size} downloads started successfully!`, 'success');
      
    } catch (error: any) {
      console.error('❌ Error downloading videos:', error);
      addNotification(`❌ Failed to start downloads: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  // Load existing videos from database
  const loadVideos = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/videos`);
      if (response.data.videos && response.data.videos.length > 0) {
        setVideos(response.data.videos);
        setChannelName(response.data.videos[0].channel_name);
        setStep(2);
        console.log(`📚 Loaded ${response.data.videos.length} videos from database`);
      }
    } catch (error) {
      console.error('❌ Error loading videos:', error);
    }
  };

  // Reset to step 1
  const resetToStart = () => {
    setStep(1);
    // Don't clear videos/channelUrl to prevent user from getting kicked out
    setSelectedVideos(new Set());
    setError('');
    setDownloadProgress({});
    setSearchQuery('');
    setSelectedCategory('All Videos');
    setCurrentPage(1);
  };

  const goBackToChannelInput = () => {
    setStep(1);
    setChannelUrl('');
    setVideos([]);
    setSelectedVideos(new Set());
    setError('');
    setChannelName('');
    setDownloadProgress({});
    setSearchQuery('');
    setSelectedCategory('All Videos');
    setCurrentPage(1);
  };

  // Video Player Functions
  const playVideo = async (video: Video) => {
    try {
      setCurrentVideo(video);
      addNotification(`🎥 Loading video player for "${video.title}"...`, 'info');
      
      // Get available qualities
      const qualitiesResponse = await axios.get(`${API_BASE}/api/video-qualities/${video.video_id}`, {
        timeout: 30000
      });
      
      if (qualitiesResponse.data.success) {
        setVideoQualities(qualitiesResponse.data.qualities);
        setSelectedQuality(qualitiesResponse.data.qualities[0] || '720p');
        
        // Get video stream
        await loadVideoStream(video.video_id, qualitiesResponse.data.qualities[0] || '720p');
        setShowVideoPlayer(true);
        addNotification(`▶️ Video player loaded successfully!`, 'success');
      }
    } catch (error: any) {
      console.error('❌ Error loading video player:', error);
      addNotification(`❌ Failed to load video player: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const loadVideoStream = async (videoId: string, quality: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/play-video/${videoId}?quality=${quality}`, {
        timeout: 30000
      });
      
      if (response.data.success) {
        setVideoStreamUrl(response.data.stream_url);
        setSelectedQuality(quality);
      } else {
        throw new Error(response.data.error || 'Failed to get stream URL');
      }
    } catch (error: any) {
      console.error('❌ Error loading video stream:', error);
      addNotification(`❌ Failed to load video stream: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const changeVideoQuality = async (quality: string) => {
    if (currentVideo) {
      addNotification(`🔄 Switching to ${quality}...`, 'info');
      await loadVideoStream(currentVideo.video_id, quality);
      addNotification(`✅ Quality changed to ${quality}`, 'success');
    }
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setCurrentVideo(null);
    setVideoStreamUrl('');
    setVideoQualities(['720p']);
    setSelectedQuality('720p');
  };

  // Pagination calculations (works with filtered videos)
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const startIndex = (currentPage - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  const currentVideos = filteredVideos.slice(startIndex, endIndex);

  // Reset to page 1 when videos change
  useEffect(() => {
    setCurrentPage(1);
  }, [videos]);

  useEffect(() => {
    // Test backend connection on load
    testBackend();
    // Try to load existing videos
    loadVideos();
    // Load recent channels from localStorage
    loadRecentChannels();
  }, []);

  return (
    <div className="min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-red-600">
            <Sparkles className="text-red-400" size={40} />
            Tube Snatch
            <Sparkles className="text-red-400" size={40} />
          </h1>
          <p className="text-red-200 text-xl">YouTube Channel Video Downloader</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant={backendConnected ? "default" : "destructive"}>
              <Monitor className="mr-1" size={12} />
              Backend: {backendConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">Step {step} of 2</Badge>
          </div>
        </motion.div>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`
                glass-dark p-4 rounded-lg shadow-lg max-w-sm border-l-4 cursor-pointer
                ${notification.type === 'success' ? 'border-l-green-500' : 
                  notification.type === 'error' ? 'border-l-red-500' : 'border-l-blue-500'}
              `}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' && <CheckCircle className="text-green-400" size={20} />}
                {notification.type === 'error' && <XCircle className="text-red-400" size={20} />}
                {notification.type === 'info' && <Info className="text-blue-400" size={20} />}
                <p className="text-white text-sm font-medium">{notification.message}</p>
                <X className="text-gray-400 hover:text-white ml-auto" size={16} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= stepNum ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 2 && (
                  <div className={`w-16 h-1 ${step > stepNum ? 'bg-red-600' : 'bg-gray-600'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="glass-dark border-red-500 bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Content based on current step */}
        <AnimatePresence mode="wait">
          {/* STEP 1: Enter Channel URL */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass-dark border-red-900/50 max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-red-400 text-2xl text-center">
                    Step 1: Enter YouTube Channel URL
                  </CardTitle>
                  <CardDescription className="text-red-200 text-center">
                    Paste the YouTube channel URL below to fetch all videos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/@channelname"
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      className="w-full p-4 text-lg rounded-xl bg-black/30 border border-red-900/50 text-white placeholder-red-300/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    
                    {/* Content Type Selection */}
                    <div className="space-y-2">
                      <label className="text-red-200 text-sm font-medium">Content Type:</label>
                      <div className="flex gap-2">
                        <Button
                          variant={contentType === 'videos' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentType('videos')}
                          className={contentType === 'videos' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-400 hover:bg-red-600/20'}
                        >
                          <Play className="mr-1" size={14} />
                          Videos
                        </Button>
                        <Button
                          variant={contentType === 'shorts' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentType('shorts')}
                          className={contentType === 'shorts' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-400 hover:bg-red-600/20'}
                        >
                          <Clock className="mr-1" size={14} />
                          Shorts
                        </Button>
                        <Button
                          variant={contentType === 'streams' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContentType('streams')}
                          className={contentType === 'streams' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-400 hover:bg-red-600/20'}
                        >
                          <Circle className="mr-1" size={14} />
                          Streams
                        </Button>
                      </div>
                      <p className="text-red-300/70 text-xs">
                        Choose content type for faster fetching. Videos = regular videos, Shorts = short-form content, Streams = live streams.
                      </p>
                    </div>

                    {/* Recent Channels */}
                    {recentChannels.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-red-200 text-sm font-medium">Recent Channels:</label>
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                          {recentChannels.slice(0, 5).map((recent, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                setChannelUrl(recent.url);
                                setError('');
                              }}
                              className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-red-900/30 cursor-pointer hover:bg-red-900/20 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{recent.name}</p>
                                <p className="text-red-300/70 text-xs">
                                  {recent.videoCount} videos • {new Date(recent.lastFetched).toLocaleDateString()}
                                </p>
                              </div>
                              <Circle className="text-red-400 ml-2" size={12} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={fetchChannelVideos}
                    disabled={loading || !channelUrl.trim() || !backendConnected}
                    className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={20} />
                        Fetching Videos...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2" size={20} />
                        Fetch All Videos from Channel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: Select Videos */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-6">
                {/* Channel Info & Controls */}
                <Card className="glass-dark border-red-900/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-red-400 text-2xl">
                          Step 2: Select Videos to Download
                        </CardTitle>
                        <CardDescription className="text-red-200">
                          {selectedCategory === 'All Videos' ? (
                            <>All Channels • {filteredVideos.length} of {videos.length} videos • Page {currentPage} of {totalPages}</>
                          ) : (
                            <>{selectedCategory} • {filteredVideos.length} of {videos.filter(v => v.channel_name === selectedCategory).length} videos • Page {currentPage} of {totalPages}</>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={goBackToChannelInput}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/20"
                      >
                        ← New Channel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Category Filter */}
                    {categories.length > 2 && (
                      <div className="mb-4">
                        <label className="text-red-200 text-sm font-medium mb-2 block">Channel Categories:</label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((category) => (
                            <Button
                              key={category}
                              variant={selectedCategory === category ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedCategory(category);
                                setCurrentPage(1); // Reset to page 1 when changing category
                              }}
                              className={`text-xs ${
                                selectedCategory === category 
                                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                                  : 'border-red-600 text-red-400 hover:bg-red-600/20'
                              }`}
                            >
                              {category}
                              {category !== 'All Videos' && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({videos.filter(v => v.channel_name === category).length})
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Search Bar */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 Search videos by title..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to page 1 when searching
                          }}
                          className="w-full p-3 pl-10 text-sm rounded-lg bg-black/30 border border-red-900/50 text-white placeholder-red-300/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-red-400">🔍</span>
                        </div>
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setCurrentPage(1);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {(searchQuery || selectedCategory !== 'All Videos') && (
                        <p className="text-red-300/70 text-xs mt-1">
                          {searchQuery ? (
                            <>Found {filteredVideos.length} videos matching "{searchQuery}"</>
                          ) : (
                            <>Showing {filteredVideos.length} videos from {selectedCategory}</>
                          )}
                          {selectedCategory !== 'All Videos' && searchQuery && (
                            <> in {selectedCategory}</>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-red-600/20 border border-red-600 rounded-lg text-red-300 text-sm">
                          🎬 1080p Quality (Like Y2mate)
                        </div>
                        <select
                          value={videosPerPage}
                          onChange={(e) => {
                            const newPerPage = parseInt(e.target.value);
                            setVideosPerPage(newPerPage);
                            setCurrentPage(1); // Reset to first page
                          }}
                          className="p-3 rounded-lg bg-black/30 border border-red-900/50 text-white"
                        >
                          <option value="12">12 per page</option>
                          <option value="24">24 per page</option>
                          <option value="48">48 per page</option>
                          <option value="100">100 per page</option>
                        </select>
                        <Badge variant="outline">
                          {selectedVideos.size} selected
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={selectAllVideos} variant="outline" size="sm">
                          Select All
                        </Button>
                        <Button onClick={clearSelection} variant="outline" size="sm">
                          Clear
                        </Button>
                        <Button onClick={resetToStart} variant="outline" size="sm">
                          New Channel
                        </Button>
                        <Button
                          onClick={downloadSelectedVideos}
                          disabled={selectedVideos.size === 0}
                          className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900"
                        >
                          <Download className="mr-2" size={18} />
                          Download Selected ({selectedVideos.size})
                        </Button>
                      </div>
        </div>
                  </CardContent>
                </Card>

                {/* Videos Grid */}
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <Card className="glass-dark border-red-900/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                            if (page > totalPages) return null;
                            return (
                              <Button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={currentPage === page ? "bg-red-600" : ""}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                        >
                          Next
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentVideos.map((video, index) => (
                    <motion.div
                      key={`${video.video_id}-${index}-${currentPage}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card 
                        className={`glass-dark border-red-900/50 video-card overflow-hidden cursor-pointer transition-all ${
                          selectedVideos.has(video.video_id) ? 'border-red-500 bg-red-900/20' : 'hover:border-red-600/50'
                        }`}
                        onClick={() => toggleVideoSelection(video.video_id)}
                      >
                        <div className="relative group">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-red-900/30 flex items-center justify-center">
                              <Play className="text-red-400" size={24} />
                            </div>
                          )}
                          
                          {/* Play Button Overlay */}
                          <motion.div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              playVideo(video);
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="bg-red-600 rounded-full p-3 shadow-lg hover:bg-red-700"
                              animate={{ 
                                boxShadow: [
                                  "0 0 20px rgba(239, 68, 68, 0.5)",
                                  "0 0 30px rgba(239, 68, 68, 0.8)", 
                                  "0 0 20px rgba(239, 68, 68, 0.5)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <PlayCircle className="text-white" size={32} />
                            </motion.div>
                          </motion.div>
                          
                          {/* Duration badge */}
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                            {video.duration}
                          </div>
                          
                          <div className="absolute top-2 left-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedVideos.has(video.video_id) 
                                ? 'bg-red-600 border-red-600' 
                                : 'border-white/50 bg-black/30'
                            }`}>
                              {selectedVideos.has(video.video_id) && (
                                <CheckCircle className="text-white" size={12} />
                              )}
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                              <Clock className="mr-1" size={10} />
                              {video.duration}
                            </Badge>
                          </div>
                          {video.downloaded && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-green-600 text-xs">
                                Downloaded
                              </Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2 text-white mb-1">
                            {video.title}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-red-200">
                              🎬 Max Quality
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadVideoToBrowser(video.video_id, video.title);
                              }}
                              size="sm"
                              variant="outline"
                              disabled={downloadingVideos.has(video.video_id)}
                              className="h-6 px-2 text-xs border-red-600 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50"
                            >
                              {downloadingVideos.has(video.video_id) ? (
                                <Loader2 size={10} className="mr-1 animate-spin" />
                              ) : (
                                <Download size={10} className="mr-1" />
                              )}
                              {downloadingVideos.has(video.video_id) ? 'DL...' : 'DL'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        
        {/* Video Player Modal */}
        <AnimatePresence>
          {showVideoPlayer && currentVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
              onClick={closeVideoPlayer}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-black rounded-xl overflow-hidden max-w-6xl w-full max-h-[90vh] glass-dark border border-red-900/50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Video Player Header */}
                <div className="flex items-center justify-between p-4 border-b border-red-900/30">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">{currentVideo.title}</h2>
                    <p className="text-red-300/70 text-sm">{currentVideo.channel_name}</p>
                  </div>
                  
                  {/* Quality Selector */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Settings className="text-red-400" size={16} />
                      <select
                        value={selectedQuality}
                        onChange={(e) => changeVideoQuality(e.target.value)}
                        className="bg-black/50 text-white border border-red-600/50 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        {videoQualities.map((quality) => (
                          <option key={quality} value={quality}>
                            {quality}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <Button
                      onClick={closeVideoPlayer}
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600/20"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
                
                {/* Video Player */}
                <div className="relative bg-black">
                  {videoStreamUrl ? (
                    <video
                      key={`${currentVideo.video_id}-${selectedQuality}`}
                      controls
                      autoPlay
                      className="w-full h-auto max-h-[70vh]"
                      poster={currentVideo.thumbnail_url}
                      crossOrigin="anonymous"
                    >
                      <source src={videoStreamUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <Loader2 className="mx-auto mb-4 animate-spin text-red-500" size={48} />
                        <p className="text-white">Loading video...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Video Player Footer */}
                <div className="p-4 border-t border-red-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="border-red-600 text-red-400">
                        📺 Ad-Free Streaming
                      </Badge>
                      <Badge variant="outline" className="border-green-600 text-green-400">
                        🎬 {selectedQuality} Quality
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => downloadVideoToBrowser(currentVideo.video_id, currentVideo.title)}
                        disabled={downloadingVideos.has(currentVideo.video_id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        {downloadingVideos.has(currentVideo.video_id) ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={16} />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2" size={16} />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}