import Cogs from '../Cogs';
import './case-study.css';

// Stands in for a case study still being written: the loader's meshed cogs,
// turning for good, in the project's palette, over one line.
export default function WorkInProgress() {
  return (
    <div className="wip" role="status">
      <Cogs />
      <p className="wip-label">Work in progress</p>
    </div>
  );
}
