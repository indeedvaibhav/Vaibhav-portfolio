import AchievementRock from './AchievementRock';
import { achievements } from '../data/achievements';

/**
 * Renders all achievement rocks positioned along the camera path.
 */
export default function AchievementField() {
  return (
    <group>
      {achievements.map((ach, i) => (
        <AchievementRock key={ach.id} achievement={ach} index={i} />
      ))}
    </group>
  );
}
