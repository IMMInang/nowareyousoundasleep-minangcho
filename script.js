const { createClient } = window.supabase;

const SUPABASE_URL = 'https://mopcauazsbbfzghwznis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V4prYpV_Biv1KI5VwbA9og__J3k8B7b'; 
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const side = urlParams.get('side') || 'left'; // 기본값은 왼쪽
const container = document.getElementById('snap-container');
const width = window.innerWidth;
const channel = _supabase.channel('scroll-sync');
let isSyncing = false;
let lastSendTime = 0; 

channel
  .on('broadcast', { event: 'sync' }, (payload) => {
    isSyncing = true; 
     const exactIndex = payload.payload.index;

    container.scrollTo({
        left: exactIndex * width,
        behavior: 'auto' 
    });

    setTimeout(() => { 
        isSyncing = false; 
    }, 100); 
  })
  .subscribe((status) => {
    console.log("현재 연결 상태:", status); 
  });

const originalSources = Array.from({ length: 53 }, (_, i) => `video/${String(i + 1).padStart(2, '0')}.mp4`);
const videoSources = [originalSources[originalSources.length - 1], ...originalSources, originalSources[0]];

const placeholders = [];
videoSources.forEach((src) => {
    const section = document.createElement('div');
    section.className = 'video-section';
    container.appendChild(section);
    
    placeholders.push({
        el: section,
        src: src,
        isActive: false,
        video: null
    });
});

function updateVideos() {
    const currentIndex = Math.round(container.scrollLeft / width);
    const buffer = 1; 

    placeholders.forEach((item, index) => {
        const isVisible = index >= currentIndex - buffer && index <= currentIndex + buffer;

        if (isVisible && !item.isActive) {
            const video = document.createElement('video');
            video.src = item.src;
            video.className = 'video-element';
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.setAttribute('preload', 'metadata'); 
            video.style.width = '200vw';
            video.style.height = '100vh';
            video.style.objectFit = 'cover';
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = (side === 'right') ? '-100vw' : '0';

            item.el.appendChild(video);
            item.video = video;
            item.isActive = true;
            
            setTimeout(() => {
                if(item.video) item.video.play().catch(() => {});
            }, 50);
        } 
        else if (!isVisible && item.isActive) {
            if (item.video) {

                item.video.pause();
                item.video.removeAttribute('src'); 
                item.video.load(); 
                item.video.remove(); 
                item.video = null;
            }
            item.isActive = false;
        }
    });
}


container.addEventListener('scroll', () => {
    const { scrollLeft, scrollWidth } = container;
    const now = Date.now();

    if (!isSyncing && (now - lastSendTime > 30)) {
        const exactIndex = scrollLeft / width;
        channel.send({
            type: 'broadcast',
            event: 'sync',
            payload: { index: exactIndex },
        });
        lastSendTime = now;
    }

    updateVideos();

    if (scrollLeft >= scrollWidth - width) {
        container.scrollLeft = width;
    } else if (scrollLeft <= 0) {
        container.scrollLeft = scrollWidth - (width * 2);
    }
});

const handleFirstTouch = () => {
    updateVideos(); 
    document.removeEventListener('touchstart', handleFirstTouch);
};
document.addEventListener('touchstart', handleFirstTouch);

updateVideos();
