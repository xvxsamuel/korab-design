import { Box, Edge, Svg } from './kit';

const CLAIM =
  'The scraper follows players: each match it reads puts the other nine players into its queue, while the stats it gathers are flushed to Postgres in batches and the site is told to refresh.';

// Wide: the crawl loop on the left turns clockwise; the stats branch leaves
// it to the right and climbs to the refresh.
function Wide() {
  return (
    <Svg className="dg-wide" w={1120} h={340} label={CLAIM}>
      <Box n={1} x={40} y={40} w={230} h={76} title="Pop the hottest player" sub="most-seen accounts first" />
      <Box n={2} x={330} y={40} w={230} h={76} title="List new ARAM games" sub="since the patch began" />
      <Box n={3} x={330} y={224} w={230} h={76} title="Fetch match + timeline" sub="IDs already seen are skipped" />
      <Box n={4} x={40} y={224} w={230} h={76} title="Queue the other nine" sub="back into the frontier" />

      <Edge pts={[270, 78, 330, 78]} />
      <Edge pts={[445, 116, 445, 224]} />
      <Edge pts={[330, 262, 270, 262]} />
      <Edge pts={[155, 224, 155, 116]} />
      <text className="dg-note" x={300} y={168} textAnchor="middle">
        one loop per region
      </text>
      <text className="dg-note" x={300} y={186} textAnchor="middle">
        Europe · Americas · Asia · SEA
      </text>

      <Box n={5} x={640} y={224} w={200} h={76} title="Aggregate" sub="per champion × patch" accent />
      <Box n={6} x={890} y={224} w={200} h={76} title="Flush to Postgres" sub="5,000 players or 30 min" accent />
      <Box n={7} x={890} y={40} w={200} h={76} title="Refresh the site" sub="revalidate tier list, builds" accent />

      <Edge pts={[560, 262, 640, 262]} accent />
      <Edge pts={[840, 262, 890, 262]} accent />
      <Edge pts={[990, 224, 990, 116]} accent label="at most every 15 min" lx={980} ly={176} anchor="end" />
    </Svg>
  );
}

function Tall() {
  return (
    <Svg className="dg-tall" w={360} h={660} label={CLAIM}>
      <Box n={1} x={14} y={20} w={156} h={72} title="Hottest player" sub="most-seen first" />
      <Box n={2} x={190} y={20} w={156} h={72} title="New ARAM games" sub="since patch start" />
      <Box n={3} x={190} y={172} w={156} h={72} title="Match + timeline" sub="skip seen IDs" />
      <Box n={4} x={14} y={172} w={156} h={72} title="Queue the other 9" sub="back into the frontier" />

      <Edge pts={[170, 56, 190, 56]} />
      <Edge pts={[268, 92, 268, 172]} />
      <Edge pts={[190, 208, 170, 208]} />
      <Edge pts={[92, 172, 92, 92]} />
      <text className="dg-note" x={180} y={128} textAnchor="middle">
        one loop
      </text>
      <text className="dg-note" x={180} y={144} textAnchor="middle">
        per region
      </text>

      <Box n={5} x={70} y={318} w={220} h={72} title="Aggregate" sub="per champion × patch" accent />
      <Box n={6} x={70} y={436} w={220} h={72} title="Flush to Postgres" sub="5,000 players or 30 min" accent />
      <Box n={7} x={70} y={554} w={220} h={72} title="Refresh the site" sub="tier list, builds" accent />

      <Edge pts={[268, 244, 268, 280, 180, 280, 180, 318]} accent />
      <Edge pts={[180, 390, 180, 436]} accent />
      <Edge pts={[180, 508, 180, 554]} accent label="≤ every 15 min" lx={190} ly={536} anchor="start" />
    </Svg>
  );
}

export default function ArampigPipeline() {
  return (
    <div className="dg">
      <Wide />
      <Tall />
    </div>
  );
}
