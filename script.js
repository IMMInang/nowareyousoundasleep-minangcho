// 브라우저 환경에서 supabase 라이브러리 참조
const { createClient } = window.supabase;

// 1. Supabase 설정
const SUPABASE_URL = 'https://mopcauazsbbfzghwznis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V4prYpV_Biv1KI5VwbA9og__J3k8B7b'; 
// [수정] supabase.createClient 대신 상단에서 선언한 createClient 사용
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// URL 끝에 ?side=left 또는 ?side=right를 붙여 접속하세요.
const urlParams = new URLSearchParams(window.location.search);
const side = urlParams.get('side') || 'left'; // 기본값은 왼쪽


// 2. 기본 변수 설정
const container = document.getElementById('snap-container');
const width = window.innerWidth;
const channel = _supabase.channel('scroll-sync');
let isSyncing = false;
let lastSendTime = 0; // 전송 간격 조절용

// 3. 실시간 수신 설정 (기능 유지 + 상태 감시 추가)
// 수신 부분 수정
channel
  .on('broadcast', { event: 'sync' }, (payload) => {
    // 내가 보낸 신호가 나에게 다시 돌아오는 경우 방지 (필요 시)
    isSyncing = true; 
    
    const exactIndex = payload.payload.index;

    container.scrollTo({
        left: exactIndex * width,
        behavior: 'auto' 
    });

    // scrollTo가 완료된 후 플래그를 해제하도록 넉넉히 시간 부여
    setTimeout(() => { 
        isSyncing = false; 
    }, 100); 
  })
  .subscribe((status) => {
    console.log("현재 연결 상태:", status); // 이 로그가 'SUBSCRIBED'인지 반드시 확인!
  });

// 4. 영상 데이터 생성 (순서 고정)
const originalSources = Array.from({ length: 53 }, (_, i) => `videos/${String(i + 1).padStart(2, '0')}.mp4`);
const videoSources = [originalSources[originalSources.length - 1], ...originalSources, originalSources[0]];

// [5] 플레이스홀더(빈 섹션) 미리 생성
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

// [6] 비디오 관리 함수 (Safari 메모리 해제 강화 버전)
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
            // Safari에서는 metadata만 먼저 가져오는 것이 안전할 수 있습니다.
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
            
            // 약간의 지연 후 재생 (Safari 렌더링 타이밍 조절)
            setTimeout(() => {
                if(item.video) item.video.play().catch(() => {});
            }, 50);
        } 
        else if (!isVisible && item.isActive) {
            if (item.video) {
                // [강화된 해제 로직]
                item.video.pause();
                item.video.removeAttribute('src'); // src 속성 자체를 제거
                item.video.load(); // 빈 상태로 로드 강제
                item.video.remove(); // DOM에서 제거
                item.video = null;
            }
            item.isActive = false;
        }
    });
}

// [7] 스크롤 이벤트 (동기화 + 비디오 업데이트)
container.addEventListener('scroll', () => {
    const { scrollLeft, scrollWidth } = container;
    const now = Date.now();

    // 1. Supabase 동기화 전송 (30ms 간격 제한)
    if (!isSyncing && (now - lastSendTime > 30)) {
        const exactIndex = scrollLeft / width;
        channel.send({
            type: 'broadcast',
            event: 'sync',
            payload: { index: exactIndex },
        });
        lastSendTime = now;
    }

    // 2. 비디오 동적 로딩 실행
    updateVideos();

    // 3. 무한 루프 로직
    if (scrollLeft >= scrollWidth - width) {
        container.scrollLeft = width;
    } else if (scrollLeft <= 0) {
        container.scrollLeft = scrollWidth - (width * 2);
    }
});

// [8] 초기 실행 및 Safari 터치 권한 확보
const handleFirstTouch = () => {
    updateVideos(); // 첫 터치 시점에 비디오 생성 및 재생 시도
    document.removeEventListener('touchstart', handleFirstTouch);
};
document.addEventListener('touchstart', handleFirstTouch);

// 최초 1회 실행
updateVideos();