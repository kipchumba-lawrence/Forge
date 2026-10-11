<template>
  <span
    ref="el"
    class="lottie-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  ></span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';
import { iconAnimation, type IconName } from '@/lottie/icons';
import { DRAW_END, POP_END, POP_START } from '@/lottie/svgToLottie';

const props = withDefaults(defineProps<{
  name: IconName;
  size?: number;
  // Pops whenever this flips to true (e.g. the selected tab).
  active?: boolean;
  // Trace the strokes in when the icon first appears.
  draw?: boolean;
}>(), { size: 24, active: false, draw: true });

const el = ref<HTMLElement | null>(null);
let anim: AnimationItem | null = null;
let host: Element | null = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function pop() {
  if (!anim || reducedMotion.matches) return;
  anim.playSegments([POP_START, POP_END], true);
}

function load() {
  anim?.destroy();
  if (!el.value) return;
  anim = lottie.loadAnimation({
    container: el.value,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    // lottie-web annotates the data it is given, so each instance gets a copy.
    animationData: structuredClone(iconAnimation(props.name)),
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });
  // lottie-web builds the SVG asynchronously; segment calls made before
  // DOMLoaded are dropped and the icon stays on frame 0 (a few round-cap dots).
  const current = anim;
  // Rest on the fully drawn frame first: if the page is hidden (app in the
  // background) animation frames are paused, and an unfinished draw-in would
  // leave the icon blank until it became visible again.
  const start = () => {
    if (current !== anim) return;
    current.goToAndStop(DRAW_END, true);
    if (props.draw && !reducedMotion.matches && !document.hidden) current.playSegments([0, DRAW_END], true);
  };
  if (current.isLoaded) start();
  else current.addEventListener('DOMLoaded', start);
}

// Pop when the surrounding button or link is tapped, not only the glyph itself.
const onHostClick = () => pop();

onMounted(() => {
  load();
  host = el.value?.closest('button, a, [role="button"]') ?? null;
  host?.addEventListener('click', onHostClick);
});

onBeforeUnmount(() => {
  host?.removeEventListener('click', onHostClick);
  anim?.destroy();
  anim = null;
});

watch(() => props.name, load);
watch(() => props.active, (on, was) => { if (on && !was) pop(); });

defineExpose({ pop });
</script>

<style scoped>
.lottie-icon {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  color: inherit;
}

/* The Lottie JSON bakes in white; repaint with the text colour so icons
   follow the theme and their parent's colour like the SVGs they replace. */
.lottie-icon :deep(path[stroke]) {
  stroke: currentColor;
}

.lottie-icon :deep(path[fill]:not([fill-opacity='0'])) {
  fill: currentColor;
}
</style>
