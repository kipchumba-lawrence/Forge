<template>
  <span
    ref="el"
    class="lottie-player"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  ></span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';
import { getAnimation, type AnimationName } from '@/lottie/animations';

// mode:
//   'loop'   – plays continuously (loaders, empty states)
//   'once'   – plays through once on mount (success ticks)
//   'toggle' – rests on frame 0 when `active` is false and on the last frame
//              when true; flipping to true plays the transition (favourite heart)
const props = withDefaults(defineProps<{
  name: AnimationName;
  size?: number;
  mode?: 'loop' | 'once' | 'toggle';
  active?: boolean;
  label?: string;
}>(), { size: 48, mode: 'loop', active: false, label: undefined });

const el = ref<HTMLElement | null>(null);
let anim: AnimationItem | null = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const lastFrame = () => (anim ? anim.totalFrames - 1 : 0);

function rest() {
  if (!anim) return;
  if (props.mode === 'toggle') anim.goToAndStop(props.active ? lastFrame() : 0, true);
  else if (props.mode === 'once') anim.goToAndStop(lastFrame(), true);
  // A loop shown without motion rests mid-cycle, where it reads best.
  else anim.goToAndStop(Math.round(lastFrame() / 2), true);
}

function start() {
  if (!anim) return;
  // Hidden pages pause animation frames; rest on a complete frame instead
  // of freezing mid-animation.
  if (reducedMotion.matches || document.hidden) return rest();
  if (props.mode === 'loop') anim.play();
  else if (props.mode === 'once') anim.playSegments([0, lastFrame()], true);
  else rest();
}

onMounted(() => {
  if (!el.value) return;
  anim = lottie.loadAnimation({
    container: el.value,
    renderer: 'svg',
    loop: props.mode === 'loop',
    autoplay: false,
    animationData: structuredClone(getAnimation(props.name))
  });
  const current = anim;
  const ready = () => { if (current === anim) start(); };
  if (current.isLoaded) ready();
  else current.addEventListener('DOMLoaded', ready);
});

watch(() => props.active, (on, was) => {
  if (!anim || props.mode !== 'toggle') return;
  if (on && !was && !reducedMotion.matches && !document.hidden) anim.playSegments([0, lastFrame()], true);
  else rest();
});

onBeforeUnmount(() => {
  anim?.destroy();
  anim = null;
});
</script>

<style scoped>
.lottie-player {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  color: inherit;
}

/* Same repainting rule as LottieIcon: follow the text colour. */
.lottie-player :deep(path[stroke]) {
  stroke: currentColor;
}

.lottie-player :deep(path[fill]:not([fill-opacity='0'])) {
  fill: currentColor;
}
</style>
