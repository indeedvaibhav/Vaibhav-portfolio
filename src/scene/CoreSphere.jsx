import CinematicStar from './star/CinematicStar';
import { CORE } from '../utils/constants';

/**
 * Central cinematic star at the origin — hero moment at scroll=0.
 */
export default function CoreSphere() {
  return (
    <group position={CORE.position}>
      <CinematicStar radius={CORE.radius} />
    </group>
  );
}
