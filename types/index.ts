export type FitnessGoal = "Lose fat" | "Build muscle" | "Improve fitness" | "Maintain fitness";
export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";
export interface UserProfile { name: string; email: string; goal: FitnessGoal; experience: ExperienceLevel; trainingDays: number; sessionLength: string; }
export interface Workout { id: string; day: string; name: string; muscles: string; duration: number; exercises: number; status?: "planned" | "rest"; }
export interface Habit { id: string; name: string; target: number; unit: string; value: number; completed: boolean; icon: string; }
export interface Activity { title: string; detail: string; time: string; icon: string; }
export interface Exercise { name: string; sets: number; reps: string; rest: string; }
