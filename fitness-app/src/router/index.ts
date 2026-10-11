import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/home' },
  // Old dashboard is replaced by Home.
  { path: '/dashboard', redirect: '/home' },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  // Food log + AI coach, reached from the Fuel card on Home.
  {
    path: '/fuel',
    name: 'Fuel',
    component: () => import('@/views/FuelView.vue')
  },
  { path: '/weigh-ins', component: () => import('@/views/WeighInsView.vue') },
  { path: '/progress', component: () => import('@/views/ProgressPhotosView.vue') },
  { path: '/plan', component: () => import('@/views/PlanView.vue') },
  { path: '/plan/routine/:id', component: () => import('@/views/RoutineEditorView.vue') },
  { path: '/start', component: () => import('@/views/StartWorkoutView.vue') },
  { path: '/workout', component: () => import('@/views/ActiveWorkoutView.vue') },
  { path: '/stats', component: () => import('@/views/StatsView.vue') },
  { path: '/stats/balance', component: () => import('@/views/StructuralBalanceView.vue') },
  { path: '/history', component: () => import('@/views/WorkoutHistoryView.vue') },
  { path: '/history/:id', component: () => import('@/views/WorkoutDetailView.vue') },
  { path: '/settings', component: () => import('@/views/settings/SettingsView.vue') },
  { path: '/settings/workout', component: () => import('@/views/settings/WorkoutSettingsView.vue') },
  { path: '/settings/look', component: () => import('@/views/settings/LookHomeSettingsView.vue') },
  { path: '/settings/data', component: () => import('@/views/settings/DataSettingsView.vue') },
  { path: '/settings/about', component: () => import('@/views/settings/AboutSettingsView.vue') },
  { path: '/food-tracker', redirect: '/fuel' },
  // Old builder/player, replaced by Start and the Active workout screen.
  { path: '/workout-player/:id', redirect: '/workout' },
  { path: '/workout-planner', redirect: '/start' },
  { path: '/exercises', component: () => import('@/views/ExercisesView.vue') },
  { path: '/exercises/muscles', component: () => import('@/views/ExploreMusclesView.vue') },
  {
    path: '/exercise/:id',
    name: 'ExerciseDetail',
    component: () => import('@/views/ExerciseDetailView.vue')
  },
  { path: '/exercise/:id/history', component: () => import('@/views/ExerciseHistoryView.vue') }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
