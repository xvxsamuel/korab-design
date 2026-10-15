import type { DiagramId } from '../../data/projects';
import ArampigArchitecture from './diagrams/ArampigArchitecture';
import ArampigCache from './diagrams/ArampigCache';
import ArampigPipeline from './diagrams/ArampigPipeline';
import ArampigScore from './diagrams/ArampigScore';
import ArampigUpdate from './diagrams/ArampigUpdate';
import VeracityPlan from './diagrams/VeracityPlan';

const DIAGRAMS: Record<DiagramId, () => React.JSX.Element> = {
  'arampig-architecture': ArampigArchitecture,
  'arampig-pipeline': ArampigPipeline,
  'arampig-update': ArampigUpdate,
  'arampig-cache': ArampigCache,
  'arampig-score': ArampigScore,
  'veracity-plan': VeracityPlan,
};

export default function Diagram({ id }: { id: DiagramId }) {
  const Drawing = DIAGRAMS[id];
  return <Drawing />;
}
