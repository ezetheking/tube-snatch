import os
import sqlite3
import json
import logging
import uuid
import tempfile
from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
from pytube import YouTube, Channel
from pytube.exceptions import VideoUnavailable
import yt_dlp
import re
import threading
import time
from datetime import datetime

# Set up logging without emojis for Windows compatibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('youtube_downloader.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/api/test', methods=['GET'])
def test_connection():
    logger.info("Test endpoint hit!")
    return jsonify({'message': 'Backend is working!', 'status': 'success'})

# Database setup
def setup_database():
    conn = sqlite3.connect('youtube_downloader.db', check_same_thread=False)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS videos
                 (id INTEGER PRIMARY KEY, 
                 video_id TEXT UNIQUE, 
                 title TEXT, 
                 thumbnail_url TEXT, 
                 duration TEXT,
                 resolutions TEXT, 
                 channel_id TEXT,
                 channel_name TEXT,
                 downloaded INTEGER DEFAULT 0,
                 download_progress INTEGER DEFAULT 0,
                 file_path TEXT)''')
    conn.commit()
    return conn

# Global variables for download progress tracking
download_progress = {}
download_threads = {}

def fetch_channel_with_ytdlp(channel_url, content_type='videos'):
    """⚡ UNCLE HYDE'S LIGHTNING FAST FETCH - No timeouts, maximum speed!"""
    logger.info(f"⚡ UNCLE HYDE'S SPEED DEMON MODE! Fetching {content_type} from: {channel_url}")
    
    # UNCLE HYDE'S MEGA CHANNEL STRATEGIES - Optimized for 2000+ videos!
    strategies = [
        {
            'name': '🏆 MEGA CHANNEL DESTROYER',
            'timeout': 40,  # MAXIMUM timeout for channels like MrBeast (900+ videos)
            'opts': {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 2000,  # MASSIVE limit for mega channels like MrBeast
                'socket_timeout': 35,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web'],
                        'player_skip': ['configs'],
                        'tab': content_type if content_type != 'videos' else None
                    }
                }
            }
        },
        {
            'name': '⚡ Lightning Web Client',
            'timeout': 20,
            'opts': {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 1500,
                'socket_timeout': 15,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web'],
                        'player_skip': ['configs']
                    }
                }
            }
        },
        {
            'name': '🚀 Rapid Android Client',
            'timeout': 15,  # Increased timeout
            'opts': {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 1800,  # Increased limit
                'socket_timeout': 12,
                'user_agent': 'com.google.android.youtube/17.36.4 (Linux; U; Android 12) gzip',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            }
        },
        {
            'name': '🔥 Mega Channel Crusher',
            'timeout': 25,  # Longest timeout for massive channels
            'opts': {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 1800,  # Increased limit
                'socket_timeout': 20,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web', 'android'],
                        'player_skip': ['configs', 'webpage'],
                        'tab': 'videos'  # Force videos tab
                    }
                }
            }
        },
        {
            'name': '💨 Speed Demon Basic',
            'timeout': 12,  # Increased timeout
            'opts': {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 1800,  # Increased limit
                'socket_timeout': 10
            }
        }
    ]
    
    all_videos = []
    seen_video_ids = set()
    channel_name = "Unknown Channel"
    channel_id = "unknown"
    
    # Prioritize URL patterns based on content type
    if content_type == 'videos':
        url_variations = [
            f"{channel_url.rstrip('/')}/videos",
            channel_url,
            f"{channel_url.rstrip('/')}/featured"
        ]
    elif content_type == 'shorts':
        url_variations = [
            f"{channel_url.rstrip('/')}/shorts",
            channel_url,
            f"{channel_url.rstrip('/')}/videos"
        ]
    elif content_type == 'streams':
        url_variations = [
            f"{channel_url.rstrip('/')}/streams",
            f"{channel_url.rstrip('/')}/live",
            channel_url
        ]
    else:
        # Default fallback
        url_variations = [
            f"{channel_url.rstrip('/')}/videos",
            channel_url
        ]
    
    # Quick success - if we get results, don't waste time on more URLs
    for strategy in strategies:
        logger.info(f"⚡ DEPLOYING: {strategy['name']} (timeout: {strategy['timeout']}s)")
        
        for test_url in url_variations:
            try:
                import threading
                import time
                
                logger.info(f"   🎯 RAPID STRIKE: {test_url}")
                
                result = [None]  # Use list to store result from thread
                exception = [None]  # Store any exception
                
                def extract_with_timeout():
                    try:
                        with yt_dlp.YoutubeDL(strategy['opts']) as ydl:
                            info = ydl.extract_info(test_url, download=False)
                            result[0] = info
                    except Exception as e:
                        exception[0] = e
                
                # Start extraction in separate thread
                thread = threading.Thread(target=extract_with_timeout)
                thread.daemon = True  # Dies when main thread dies
                thread.start()
                thread.join(timeout=strategy['timeout'])
                
                if thread.is_alive():
                    logger.warning(f"   ⏰ TIMEOUT! {test_url} took >{strategy['timeout']}s - SKIPPING!")
                    continue
                
                if exception[0]:
                    raise exception[0]
                
                info = result[0]
                if not info:
                    continue
                
                # Update channel info
                if info.get('title'):
                    channel_name = info.get('title', channel_name)
                if info.get('id'):
                    channel_id = info.get('id', channel_id)
                
                entries = info.get('entries', [])
                new_videos_count = 0
                
                # Process entries quickly
                for entry in entries:
                    if not entry:
                        continue
                    
                    video_id = entry.get('id', '')
                    if not video_id or video_id in seen_video_ids:
                        continue
                    
                    seen_video_ids.add(video_id)
                    new_videos_count += 1
                    
                    # Generate thumbnail URL manually
                    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                    
                    video_data = {
                        'video_id': video_id,
                        'title': entry.get('title', 'Unknown Title'),
                        'thumbnail_url': thumbnail_url,
                        'duration': entry.get('duration_string', 'Unknown'),
                        'resolutions': ['highest'],  # Always use highest quality
                        'channel_id': channel_id,
                        'channel_name': channel_name
                    }
                    all_videos.append(video_data)
                
                if new_videos_count > 0:
                    logger.info(f"   💥 JACKPOT! {new_videos_count} videos!")
                    
                    # If we got a substantial haul (50+ videos), that's enough - don't waste user's time!
                    if len(all_videos) >= 50:
                        logger.info(f"🏆 JACKPOT SUCCESS! {len(all_videos)} videos - RETURNING IMMEDIATELY!")
                        return {
                            'success': True,
                            'channel_name': channel_name,
                            'channel_id': channel_id,
                            'videos': all_videos
                        }
                    break  # Try next strategy
                    
            except Exception as e:
                logger.warning(f"   ⚠️ {test_url} failed: {str(e)[:100]}")
                continue
        
        # Quick status update
        if len(all_videos) > 0:
            logger.info(f"📊 Speed check: {len(all_videos)} videos collected")
    
    logger.info(f"🚀 FINAL RESULT: {len(all_videos)} VIDEOS for '{channel_name}'!")
    
    if len(all_videos) > 0:
        return {
            'success': True,
            'channel_name': channel_name,
            'channel_id': channel_id,
            'videos': all_videos
        }
    else:
        logger.error("💥 SPEED DEMON COULDN'T BREAK THROUGH - YouTube's defenses too strong!")
        return None

@app.route('/api/fetch-channel', methods=['POST'])
def fetch_channel():
    data = request.get_json()
    channel_url = data.get('channel_url')
    content_type = data.get('content_type', 'videos')  # Default to videos
    
    # Clean the URL - remove content type suffix if present  
    if channel_url:
        for suffix in ['/videos', '/shorts', '/streams', '/live']:
            if channel_url.endswith(suffix):
                channel_url = channel_url.replace(suffix, '')
                break
    
    logger.info(f"Received request to fetch {content_type} from channel: {channel_url}")
    
    if not channel_url:
        logger.error("No channel URL provided")
        return jsonify({'error': 'Channel URL is required'}), 400
    
    try:
        logger.info(f"Starting to fetch {content_type} from: {channel_url}")
        
        # First try yt-dlp which is more reliable
        ytdlp_result = fetch_channel_with_ytdlp(channel_url, content_type)
        if ytdlp_result:
            logger.info("Successfully fetched with yt-dlp")
            conn = setup_database()
            c = conn.cursor()
            
            channel_id = ytdlp_result['channel_id'] 
            channel_name = ytdlp_result['channel_name']
            videos_data = ytdlp_result['videos']
            
            # Clear existing videos for this channel
            c.execute("DELETE FROM videos WHERE channel_id=?", (channel_id,))
            logger.info(f"Cleared existing videos for channel: {channel_name}")
            
            # Insert videos into database
            for video_data in videos_data:
                c.execute('''INSERT OR IGNORE INTO videos 
                             (video_id, title, thumbnail_url, duration, resolutions, channel_id, channel_name) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)''',
                         (video_data['video_id'], video_data['title'], video_data['thumbnail_url'], 
                          video_data['duration'], ",".join(video_data['resolutions']), channel_id, channel_name))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'channel_name': channel_name,
                'video_count': len(videos_data),
                'videos': videos_data
            })
        
        # Fallback to PyTube if yt-dlp fails
        logger.info("yt-dlp failed, trying PyTube fallback")
        conn = setup_database()
        c = conn.cursor()
        
        # Try different URL formats to make PyTube work
        urls_to_try = [
            channel_url,
            channel_url + '/videos',
            channel_url.replace('/@', '/c/'),
            channel_url.replace('/@', '/user/')
        ]
        
        channel = None
        working_url = None
        
        for url in urls_to_try:
            try:
                logger.info(f"Trying URL format: {url}")
                channel = Channel(url)
                # Test if we can access basic properties
                _ = channel.channel_name
                _ = channel.channel_id
                working_url = url
                logger.info(f"Success with URL: {url}")
                break
            except Exception as e:
                logger.warning(f"Failed with URL {url}: {str(e)}")
                continue
        
        if not channel:
            raise Exception("Could not access channel with any URL format. Try a different channel URL format.")
        
        channel_id = channel.channel_id
        channel_name = channel.channel_name
        
        logger.info(f"Successfully connected to channel: {channel_name} (ID: {channel_id})")
        
        # Clear existing videos for this channel
        c.execute("DELETE FROM videos WHERE channel_id=?", (channel_id,))
        logger.info(f"Cleared existing videos for channel: {channel_name}")
        
        videos_data = []
        video_count = 0
        
        logger.info("Starting to process videos...")
        
        # Get videos with better error handling
        try:
            videos_list = list(channel.videos)
            logger.info(f"Found {len(videos_list)} videos in channel")
        except Exception as e:
            logger.error(f"Error getting videos list: {e}")
            return jsonify({'error': f'Could not get videos from channel: {str(e)}'}), 500
        
        for video in videos_list:
            try:
                logger.info(f"Processing video: {video.title[:50]}...")
                
                # Get available resolutions
                streams = video.streams.filter(progressive=True, file_extension='mp4')
                resolutions = sorted(set(f"{s.resolution}" for s in streams if s.resolution), 
                                    key=lambda x: int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 0, 
                                    reverse=True)
                
                # Fallback if no progressive streams
                if not resolutions:
                    streams = video.streams.filter(file_extension='mp4')
                    resolutions = sorted(set(f"{s.resolution}" for s in streams if s.resolution), 
                                        key=lambda x: int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 0, 
                                        reverse=True)
                
                # Format duration
                duration = f"{video.length // 60}:{video.length % 60:02d}" if video.length else "Unknown"
                
                video_data = {
                    'video_id': video.video_id,
                    'title': video.title,
                    'thumbnail_url': video.thumbnail_url,
                    'duration': duration,
                    'resolutions': resolutions if resolutions else ['720p'],  # Fallback
                    'channel_id': channel_id,
                    'channel_name': channel_name
                }
                
                videos_data.append(video_data)
                
                # Insert into database
                c.execute('''INSERT OR IGNORE INTO videos 
                             (video_id, title, thumbnail_url, duration, resolutions, channel_id, channel_name) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)''',
                         (video.video_id, video.title, video.thumbnail_url, duration, 
                          ",".join(resolutions if resolutions else ['720p']), channel_id, channel_name))
                
                video_count += 1
                logger.info(f"Processed video {video_count}: {video.title[:30]}...")
                
                # No limit - get all videos
                if video_count % 10 == 0:  # Log progress every 10 videos
                    logger.info(f"Processed {video_count} videos so far...")
                    
            except VideoUnavailable:
                logger.warning(f"Video unavailable, skipping")
                continue
            except Exception as e:
                logger.error(f"Error processing video: {e}")
                continue
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'channel_name': channel_name,
            'video_count': len(videos_data),
            'videos': videos_data
        })
        
    except Exception as e:
        logger.error(f"Error in fetch_channel: {str(e)}")
        error_msg = str(e)
        if "could not find match for patterns" in error_msg.lower():
            error_msg = "Could not access this channel. Try using a different channel URL format or a different channel."
        elif "channel" in error_msg.lower() and "not found" in error_msg.lower():
            error_msg = "Channel not found. Please check the URL and try again."
        return jsonify({'error': error_msg}), 500

@app.route('/api/videos', methods=['GET'])
def get_videos():
    try:
        conn = setup_database()
        c = conn.cursor()
        c.execute("SELECT * FROM videos")
        videos = c.fetchall()
        conn.close()
        
        videos_list = []
        for video in videos:
            videos_list.append({
                'id': video[0],
                'video_id': video[1],
                'title': video[2],
                'thumbnail_url': video[3],
                'duration': video[4],
                'resolutions': video[5].split(',') if video[5] else [],
                'channel_id': video[6],
                'channel_name': video[7],
                'downloaded': bool(video[8]),
                'download_progress': video[9],
                'file_path': video[10]
            })
        
        return jsonify({'videos': videos_list})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def download_video_thread(video_id, resolution):
    try:
        conn = setup_database()
        c = conn.cursor()
        
        # Get video info
        c.execute("SELECT * FROM videos WHERE video_id=?", (video_id,))
        video = c.fetchone()
        
        if not video:
            download_progress[video_id] = {'status': 'error', 'message': 'Video not found'}
            return
        
        download_progress[video_id] = {'status': 'downloading', 'progress': 0}
        
        # Create downloads directory
        os.makedirs("downloads", exist_ok=True)
        
        # Use yt-dlp for actual downloading (more reliable)
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                if 'total_bytes' in d and d['total_bytes']:
                    percent = (d['downloaded_bytes'] / d['total_bytes']) * 100
                    download_progress[video_id] = {'status': 'downloading', 'progress': int(percent)}
                elif '_percent_str' in d:
                    # Extract percentage from string like "50.2%"
                    percent_str = d['_percent_str'].replace('%', '')
                    try:
                        percent = float(percent_str)
                        download_progress[video_id] = {'status': 'downloading', 'progress': int(percent)}
                    except:
                        pass
            elif d['status'] == 'finished':
                download_progress[video_id] = {'status': 'completed', 'progress': 100, 'file_path': d['filename']}
        
        # Configure yt-dlp for 1080p MAXIMUM quality like Y2mate (DASH merging)
        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',  # 1080p max with DASH merging
            'outtmpl': f'downloads/{video_id}_%(title)s.%(ext)s',  # Include video ID in filename
            'merge_output_format': 'mp4',  # Force merge to MP4 like Y2mate
            'progress_hooks': [progress_hook],
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['configs', 'webpage']
                }
            },
            'retries': 5,
            'fragment_retries': 5,
            'skip_unavailable_fragments': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Starting download of {video_id} at {resolution}")
            ydl.download([video_url])
        
        # Find the downloaded file and update database with file path
        downloads_dir = "downloads"
        downloaded_file = None
        if os.path.exists(downloads_dir):
            for filename in os.listdir(downloads_dir):
                if filename.startswith(f"{video_id}_"):
                    downloaded_file = filename
                    break
        
        if downloaded_file:
            c.execute("UPDATE videos SET downloaded=1, download_progress=100, file_path=? WHERE video_id=?", 
                     (downloaded_file, video_id))
        else:
            c.execute("UPDATE videos SET downloaded=1, download_progress=100 WHERE video_id=?", (video_id,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Download completed for {video_id}, file: {downloaded_file}")
        
    except Exception as e:
        logger.error(f"Download error for {video_id}: {str(e)}")
        download_progress[video_id] = {'status': 'error', 'message': str(e)}

@app.route('/api/download', methods=['POST'])
def download_videos():
    data = request.get_json()
    video_ids = data.get('video_ids', [])
    resolution = data.get('resolution', 'highest')
    
    if not video_ids:
        return jsonify({'error': 'No video IDs provided'}), 400
    
    # Start download threads
    for video_id in video_ids:
        if video_id not in download_threads or not download_threads[video_id].is_alive():
            thread = threading.Thread(target=download_video_thread, args=(video_id, resolution))
            download_threads[video_id] = thread
            thread.start()
    
    return jsonify({'success': True, 'message': 'Downloads started'})

@app.route('/api/download-progress', methods=['GET'])
def get_download_progress():
    return jsonify(download_progress)

@app.route('/api/clear-downloads', methods=['POST'])
def clear_downloads():
    global download_progress
    download_progress = {}
    return jsonify({'success': True})

@app.route('/api/stream-download/<video_id>', methods=['GET'])
def stream_download(video_id):
    """Stream download directly to browser - no temp files, real Chrome progress!"""
    try:
        conn = setup_database()
        c = conn.cursor()
        c.execute("SELECT * FROM videos WHERE video_id=?", (video_id,))
        video = c.fetchone()
        conn.close()
        
        if not video:
            logger.error(f"Video {video_id} not found in database")
            return jsonify({'error': 'Video not found'}), 404
        
        video_title = video[2]  # title is at index 2
        resolution = request.args.get('resolution', 'highest')
        
        # Clean filename for browser download
        clean_filename = f"{video_title[:50].replace('/', '_').replace('\\', '_').replace(':', '_').replace('?', '_').replace('*', '_').replace('<', '_').replace('>', '_').replace('|', '_')}.mp4"
        
        logger.info(f"🚀 Starting direct stream download: {clean_filename}")
        
        # Get YouTube video URL
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        
        # Configure yt-dlp for 1080p MAXIMUM quality like Y2mate (DASH merging)
        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',  # 1080p max with DASH merging
            'quiet': True,
            'no_warnings': True,
            'merge_output_format': 'mp4',  # Force merge to MP4
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['configs', 'webpage']
                }
            },
            'retries': 5,
            'fragment_retries': 5,
            'skip_unavailable_fragments': True,
        }
        
        # Download to temp file first with proper 1080p quality, then stream it
        
        temp_id = uuid.uuid4().hex
        temp_filename = f"temp_{temp_id}.%(ext)s"
        temp_path = os.path.join("downloads", temp_filename)
        os.makedirs("downloads", exist_ok=True)
        
        # Update ydl_opts to actually download the file with proper quality
        ydl_opts['outtmpl'] = temp_path
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"🎬 Downloading 1080p video {video_id} to temp file...")
                ydl.download([video_url])
            
            # Find the actual downloaded file (yt-dlp might change the extension)
            actual_file = None
            downloads_dir = "downloads"
            if os.path.exists(downloads_dir):
                for filename in os.listdir(downloads_dir):
                    if filename.startswith(f"temp_{temp_id}"):
                        actual_file = os.path.join(downloads_dir, filename)
                        break
            
            if not actual_file or not os.path.exists(actual_file):
                return jsonify({'error': 'Failed to download video file'}), 500
            
            logger.info(f"✅ Successfully downloaded 1080p file: {actual_file}")
            
        except Exception as e:
            logger.error(f"❌ Download failed: {str(e)}")
            return jsonify({'error': f'Download failed: {str(e)}'}), 500
        
        # Stream the actual 1080p downloaded file to browser
        from flask import Response, stream_with_context
        
        def generate():
            with open(actual_file, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
        
        # Get file size for proper download progress
        file_size = os.path.getsize(actual_file)
        
        response = Response(
            stream_with_context(generate()),
            mimetype='video/mp4',
            headers={
                'Content-Disposition': f'attachment; filename="{clean_filename}"',
                'Content-Length': str(file_size),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Disposition,Content-Length',
                'Cache-Control': 'no-cache'
            }
        )
        
        # Clean up temp file after streaming (in background)
        def cleanup_temp_file():
            try:
                time.sleep(5)  # Wait a bit for download to start
                if os.path.exists(actual_file):
                    os.remove(actual_file)
                    logger.info(f"🗑️ Cleaned up temp file: {actual_file}")
            except Exception as e:
                logger.warning(f"Could not clean up temp file: {e}")
        
        import threading
        cleanup_thread = threading.Thread(target=cleanup_temp_file)
        cleanup_thread.daemon = True
        cleanup_thread.start()
        
        logger.info(f"✅ Started streaming 1080p download: {clean_filename} ({file_size} bytes)")
        return response
        
    except Exception as e:
        logger.error(f"❌ Stream download error for {video_id}: {str(e)}")
        return jsonify({'error': f'Stream download failed: {str(e)}'}), 500

@app.route('/api/download-file/<video_id>', methods=['GET'])
def download_file(video_id):
    """Fallback method - serve from local files if they exist"""
    try:
        conn = setup_database()
        c = conn.cursor()
        c.execute("SELECT * FROM videos WHERE video_id=? AND downloaded=1", (video_id,))
        video = c.fetchone()
        conn.close()
        
        if not video:
            # If not downloaded locally, redirect to stream download
            return redirect(f'/api/stream-download/{video_id}')
        
        downloads_dir = "downloads"
        if not os.path.exists(downloads_dir):
            return redirect(f'/api/stream-download/{video_id}')
        
        # First try to use stored file_path from database (column 11)
        stored_filename = video[11] if len(video) > 11 and video[11] else None
        
        if stored_filename:
            file_path = os.path.join(downloads_dir, stored_filename)
            if os.path.exists(file_path):
                # Clean filename for download using video title
                video_title = video[2]  # title is at index 2
                clean_filename = f"{video_title[:50].replace('/', '_').replace('\\', '_').replace(':', '_').replace('?', '_').replace('*', '_').replace('<', '_').replace('>', '_').replace('|', '_')}.{stored_filename.split('.')[-1]}"
                
                response = send_file(
                    file_path, 
                    as_attachment=True, 
                    download_name=clean_filename,
                    mimetype='video/mp4'
                )
                
                # Add CORS headers for browser download
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
                
                logger.info(f"✅ Serving cached file: {clean_filename}")
                return response
        
        # Fallback: Look for files starting with video ID
        for filename in os.listdir(downloads_dir):
            if filename.startswith(f"{video_id}_"):
                file_path = os.path.join(downloads_dir, filename)
                if os.path.exists(file_path):
                    # Clean filename for download
                    video_title = video[2]  # title is at index 2
                    clean_filename = f"{video_title[:50].replace('/', '_').replace('\\', '_').replace(':', '_').replace('?', '_').replace('*', '_').replace('<', '_').replace('>', '_').replace('|', '_')}.{filename.split('.')[-1]}"
                    
                    response = send_file(
                        file_path, 
                        as_attachment=True, 
                        download_name=clean_filename,
                        mimetype='video/mp4'
                    )
                    
                    # Add CORS headers for browser download
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
                    
                    logger.info(f"✅ Serving cached file (fallback): {clean_filename}")
                    return response
        
        # No local file found, redirect to stream download
        return redirect(f'/api/stream-download/{video_id}')
        
    except Exception as e:
        logger.error(f"Error serving download: {str(e)}")
        return redirect(f'/api/stream-download/{video_id}')

if __name__ == '__main__':
    setup_database()
    logger.info("Tube Snatch - YouTube Downloader Server Starting...")
    logger.info("Starting server on http://127.0.0.1:8000")
    app.run(debug=True, host='127.0.0.1', port=8000)
