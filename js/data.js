/* AOMG Concept Redesign — data.js
 * 출처: AOMG 공식 사이트(aomgofficial.com) 각 아티스트 페이지, 홈 피드 (2026-10-26 확인)
 * 카피: docs/copy-strategy.md 4장
 * null = [needs-check] (확인 전까지 화면에 표시하지 않음)
 */

const AOMG = {
  social: {
    instagram: 'https://www.instagram.com/aomgofficial',
    youtube: 'https://www.youtube.com/channel/UCW5gbSGTGIukUDsPt2sdhGw',
    facebook: 'https://www.facebook.com/AOMGOFFICIAL',
    soundcloud: 'https://soundcloud.com/aomgofficial',
  },
  email: 'info@aomgofficial.com',
};

const ARTISTS = [
  {
    id: 'yugyeom', name: 'YUGYEOM', nameKo: '유겸', image: 'img/artist-yugyeom.webp',
    tagline: '2021년 AOMG에 합류한 솔로 아티스트.',
    bio: { ko: '2014년 그룹 GOT7으로 데뷔했다. 2021년 첫 솔로 EP [Point Of View: U]의 전곡 작사·작곡에 참여했다. 2024년 첫 정규 앨범 [TRUST ME]를 발표했다.', en: null },
    links: [], related: ['jvckiwai', 'punchnello', 'kimkipyo'],
  },
  {
    id: 'jvckiwai', name: 'JVCKI WAI', nameKo: '재키와이', image: 'img/artist-jvckiwai.webp',
    tagline: '2015년 믹스테이프로 시작한 래퍼.',
    bio: { ko: '2015년 믹스테이프 [Life Sucks]로 커리어를 시작했다. 2022년 10월 AOMG 합류와 함께 싱글 [Go Back]을 발표했다.', en: null },
    links: [], related: ['uglyduck', 'punchnello', 'keyveatz'],
  },
  {
    id: 'kian84', name: 'KIAN84', nameKo: '기안84', image: 'img/artist-kian84.webp',
    tagline: '웹툰 작가, 방송인, 팝아트 화가.',
    bio: { ko: '2008년 웹툰 ‘노병가’로 데뷔해 ‘패션왕’, ‘복학왕’을 연재했다. 2016년부터 ‘나 혼자 산다’에 출연 중이다. 2026년 제62회 백상예술대상 방송부문 남자 예능상을 받았다.', en: null },
    links: [], related: ['koreanzombie', 'leemijoo', 'sikkoo'],
  },
  {
    id: 'koreanzombie', name: 'KOREAN ZOMBIE', nameKo: '정찬성', image: 'img/artist-koreanzombie.webp',
    tagline: 'UFC 페더급에서 활약한 종합격투기 선수.',
    bio: { ko: '‘코리안 좀비’라는 이름으로 UFC에서 활약했다. 페더급 랭킹 3위까지 올랐고, 아시아 선수 최초로 UFC 페더급 타이틀전에 도전했다.', en: null },
    links: [], related: ['kian84', 'leemijoo', 'yugyeom'],
  },
  {
    id: 'leemijoo', name: 'LEE MI JOO', nameKo: '이미주', image: 'img/artist-leemijoo.webp',
    tagline: '가수, 방송인.',
    bio: { ko: null, en: null }, // [needs-check] 공식 아티스트 페이지 없음
    links: [], related: ['kian84', 'yugyeom', 'koreanzombie'],
  },
  {
    id: 'uglyduck', name: 'UGLY DUCK', nameKo: '어글리 덕', image: 'img/artist-uglyduck.webp',
    tagline: '래퍼이자 DJ.',
    bio: { ko: 'EP [Scene Stealers], DeVita와의 콜라보 앨범 [Men In Black]을 발표했다. DJ 크루 BACKnFORTH의 멤버로 파티와 공연에서 DJ로도 활동한다.', en: null },
    links: [], related: ['jvckiwai', 'punchnello', 'sikkoo'],
  },
  {
    id: 'kimkipyo', name: 'KIMKIPYØ', nameKo: '김기표', image: 'img/artist-kimkipyo.webp',
    tagline: '2026년 AOMG에 합류한 래퍼.',
    bio: { ko: '《RAP:PUBLIC》과 《Show Me the Money 12》로 이름을 알렸다. 2026년 AOMG와 계약하고 4월 12일 EP [CHECK OUT]을 발표했다.', en: null },
    links: [], related: ['keyveatz', 'sikkoo', 'punchnello'],
  },
  {
    id: 'punchnello', name: 'PUNCHNELLO', nameKo: '펀치넬로', image: 'img/artist-punchnello.webp',
    tagline: 'Show Me the Money 8 우승 래퍼.',
    bio: { ko: '2015년 믹스테이프로 주목받고 데뷔 싱글 [LIME]을 냈다. 2019년 《Show Me the Money 8》 우승 후 AOMG에 합류했다. EP [묻다.(bury.)]로 음악 영역을 넓혀 왔다.', en: null },
    links: [], related: ['jvckiwai', 'uglyduck', 'kimkipyo'],
  },
  {
    id: 'keyveatz', name: 'KEYVEATZ', nameKo: '키비츠', image: 'img/artist-keyveatz.webp',
    tagline: 'AOMG의 새로운 걸크루.',
    theme: { accent: '#B0B0D0', bg: '#000000', text: '#FFFFFF' }, // tokens.json component.artist-theme.keyveatz
    bio: {
      ko: '키비츠는 다섯 명의 Messy Girl이 모인 AOMG의 걸크루다. 이름에는 새로운 흐름을 여는 열쇠(Key)가 되겠다는 뜻을 담았다. AOMG의 힙합 DNA를 이어받아 언더그라운드와 서브컬처로 영역을 넓힌다. 다듬지 않은 움직임이 키비츠의 정체성이다.',
      en: "Keyveatz is AOMG's new girl crew of five Messy Girls. Inheriting AOMG's hip-hop DNA, the crew moves across underground scenes and subcultures with raw, unpolished energy.",
    },
    links: [
      { label: 'INSTAGRAM', url: 'https://www.instagram.com/keyveatz/' },
      { label: 'YOUTUBE', url: 'https://www.youtube.com/@Keyveatz' },
      { label: 'TIKTOK', url: 'https://www.tiktok.com/@keyveatz' },
      { label: 'X', url: 'https://x.com/Keyveatz' },
      { label: 'SPOTIFY', url: 'https://open.spotify.com/artist/6f8BfBKDA1P0yLj6uAmLLF' },
    ],
    related: ['kimkipyo', 'sikkoo', 'jvckiwai', 'punchnello'],
  },
  {
    id: 'sikkoo', name: 'SIKKOO', nameKo: '식구', image: 'img/artist-sikkoo.webp',
    tagline: '요시, 200, 구민재의 혼성 힙합 그룹.',
    bio: { ko: '2024년 8월 스페셜 앨범 [HAN : Cooked]로 데뷔했다. 직접 콘텐츠를 기획하는 멀티플레이어 그룹이다.', en: null },
    links: [], related: ['keyveatz', 'kimkipyo', 'uglyduck'],
  },
];

// Discography — copy-strategy.md 4-3
const RELEASES = [
  { id: 'oxygen', title: 'OXY_GEN', artistId: 'keyveatz', artist: 'KEYVEATZ', type: '1ST EP', year: 2026, date: '2026.06.30', cover: 'img/release-keyveatz-oxygen.webp', listen: 'https://open.spotify.com/artist/6f8BfBKDA1P0yLj6uAmLLF', trackId: 'demo-01' },
  { id: 'keybeats', title: 'KEY BEATS', artistId: 'keyveatz', artist: 'KEYVEATZ', type: 'PRE-RELEASE SINGLE', year: 2026, date: '2026.05', cover: 'img/release-keyveatz-keybeats.webp', listen: 'https://open.spotify.com/artist/6f8BfBKDA1P0yLj6uAmLLF', trackId: 'demo-02' }, // date [needs-check]
  { id: 'checkout', title: 'CHECK OUT', artistId: 'kimkipyo', artist: 'KIMKIPYØ', type: 'EP', year: 2026, date: '2026.04.12', cover: 'img/release-kimkipyo-checkout.webp', listen: null },
  { id: 'trustme', title: 'TRUST ME', artistId: 'yugyeom', artist: 'YUGYEOM', type: '1ST ALBUM', year: 2024, date: '2024', cover: 'img/release-yugyeom-trustme.webp', listen: null }, // date [needs-check]
  { id: 'hancooked', title: 'HAN : Cooked', artistId: 'sikkoo', artist: 'SIKKOO', type: 'SPECIAL ALBUM', year: 2024, date: '2024.08', cover: 'img/release-sikkoo-hancooked.webp', listen: null },
  { id: 'goback', title: 'Go Back', artistId: 'jvckiwai', artist: 'JVCKI WAI', type: 'SINGLE', year: 2022, date: '2022.10', cover: 'img/release-jvckiwai-goback.webp', listen: null },
  { id: 'pov', title: 'Point Of View: U', artistId: 'yugyeom', artist: 'YUGYEOM', type: 'EP', year: 2021, date: '2021.06', cover: null, listen: null },
  { id: 'doodle', title: '낙서', artistId: 'punchnello', artist: 'PUNCHNELLO', type: 'SINGLE', year: 2019, date: '2019', cover: 'img/release-punchnello-doodle.webp', listen: null }, // date [needs-check]
  { id: 'mib', title: 'Men In Black', artistId: 'uglyduck', artist: 'UGLY DUCK & DeVita', type: 'COLLABORATION ALBUM', year: 2019, date: '2019', cover: 'img/release-uglyduck-mib.webp', listen: null }, // date [needs-check]
];

// Demo audio — prd.md 7장. src가 null이면 player.js가 합성 비트로 재생
// 저작권 free 음원을 audio/에 넣으면 src에 경로를 적는다 (없는 파일을 적으면 404 콘솔 오류 발생)
const TRACKS = [
  { id: 'demo-01', title: 'DEMO BEAT 01', src: null, bpm: null },
  { id: 'demo-02', title: 'DEMO BEAT 02', src: null, bpm: null },
  { id: 'demo-03', title: 'DEMO BEAT 03', src: null, bpm: null },
];

// 영상 제목·유튜브 ID는 [needs-check]. 제목이 없으면 카드에 제목을 표시하지 않음
const VIDEOS = [
  { id: 'kvz-v1', artistId: 'keyveatz', title: null, thumb: 'img/video-keyveatz-01.webp', url: 'https://www.youtube.com/@Keyveatz' },
  { id: 'kvz-v2', artistId: 'keyveatz', title: null, thumb: 'img/video-keyveatz-02.webp', url: 'https://www.youtube.com/@Keyveatz' },
  { id: 'kvz-v3', artistId: 'keyveatz', title: null, thumb: 'img/video-keyveatz-03.webp', url: 'https://www.youtube.com/@Keyveatz' },
];

// 확인된 공연 일정 없음 → 빈 상태 문구 표시 (copy-strategy.md 4-4)
const EVENTS = [];

// copy-strategy.md 4-5
const NEWS = [
  { id: 'n1', category: 'RELEASE', title: '키비츠 첫 EP [OXY_GEN] 발매', date: '2026.06', image: 'img/news-keyveatz-messygirls.webp', artistIds: ['keyveatz'], url: AOMG.social.instagram },
  { id: 'n2', category: 'AWARD', title: '기안84, 제62회 백상예술대상 방송부문 남자 예능상', date: '2026.05', image: 'img/news-kian84-baeksang.webp', artistIds: ['kian84'], url: AOMG.social.instagram },
  { id: 'n3', category: 'CREW', title: '키비츠 크루 소개 — KANG YESEUL', date: '2026.04', image: 'img/news-keyveatz-kangyeseul.webp', artistIds: ['keyveatz'], url: AOMG.social.instagram },
  { id: 'n4', category: 'CREW', title: '키비츠 크루 소개 — UM JIONE', date: '2026.04', image: 'img/news-keyveatz-umjione.webp', artistIds: ['keyveatz'], url: AOMG.social.instagram },
];
