import { Box, Edge, Group, Row, Svg } from './kit';

const CLAIM =
  'Players read through the Cloudflare edge and the Next.js cache; a separate scraper fetches matches from Riot, writes them to Postgres and tells the site when to refresh.';

// Wide: the read path runs along the top row, the write path along the
// bottom, and both land in Postgres on the right. Accent marks the writes.
function Wide() {
  return (
    <Svg className="dg-wide" w={1120} h={430} label={CLAIM}>
      <Group x={460} y={20} w={650} h={392} label="Hetzner VPS · Dokploy" />

      <Box x={20} y={64} w={170} h={76} title="Browser" sub="React 19 · TanStack Query" />
      <Box x={250} y={64} w={170} h={76} title="Cloudflare" sub="edge cache · 5 min" />
      <Box x={484} y={64} w={140} h={76} title="Traefik" sub="Cloudflare-only" />
      <Box x={664} y={64} w={200} h={76} title="Next.js 16" sub="ISR · /api · process cache" />
      <Box x={910} y={64} w={186} h={328} title="PostgreSQL 18" sub="3 schemas" top />
      <Row x={924} y={140} w={158} name="public" detail="players, matches, scores" />
      <Row x={924} y={196} w={158} name="stats" detail="champion × patch tallies" />
      <Row x={924} y={252} w={158} name="analytics" detail="ingest receipts" />
      <Box x={664} y={316} w={200} h={76} title="Scraper" sub="4 regional crawlers" accent />
      <Box x={250} y={316} w={170} h={76} title="Riot Games API" sub="match-v5 · timelines" />

      <Edge pts={[190, 102, 250, 102]} label="requests" lx={220} ly={92} />
      <Edge pts={[420, 102, 484, 102]} label="misses" lx={452} ly={92} />
      <Edge pts={[624, 102, 664, 102]} />
      <Edge pts={[864, 102, 910, 102]} label="reads" lx={887} ly={92} />

      <Edge pts={[690, 140, 690, 228, 335, 228, 335, 316]} label="profile updates" lx={512} ly={218} />
      <Edge pts={[770, 140, 770, 316]} dashed label="yield region" lx={762} ly={276} anchor="end" />
      <Edge pts={[830, 316, 830, 140]} dashed accent label="revalidate" lx={838} ly={276} anchor="start" />

      <Edge pts={[664, 354, 420, 354]} accent label="matches + timelines" lx={542} ly={344} />
      <Edge pts={[864, 354, 910, 354]} accent label="upserts" lx={887} ly={344} />
    </Svg>
  );
}

// Tall: one column, top to bottom. Postgres sits between the web app and
// the scraper so both reach it directly; the side calls run in the gutters.
function Tall() {
  return (
    <Svg className="dg-tall" w={360} h={830} label={CLAIM}>
      <Group x={8} y={192} w={344} h={520} label="Hetzner VPS" />

      <Box x={90} y={10} w={200} h={60} title="Browser" sub="React 19 · TanStack Query" />
      <Box x={90} y={108} w={200} h={60} title="Cloudflare" sub="edge cache · 5 min" />
      <Box x={90} y={236} w={200} h={56} title="Traefik" sub="Cloudflare-only" />
      <Box x={90} y={322} w={200} h={64} title="Next.js 16" sub="ISR · /api · process cache" />
      <Box x={90} y={446} w={200} h={64} title="PostgreSQL 18" sub="public · stats · analytics" />
      <Box x={90} y={582} w={200} h={64} title="Scraper" sub="4 regional crawlers" accent />
      <Box x={90} y={752} w={200} h={64} title="Riot Games API" sub="match-v5 · timelines" />

      <Edge pts={[190, 70, 190, 108]} label="requests" lx={198} ly={94} anchor="start" />
      <Edge pts={[190, 168, 190, 236]} label="misses" lx={198} ly={186} anchor="start" />
      <Edge pts={[190, 292, 190, 322]} />
      <Edge pts={[190, 386, 190, 446]} label="reads" lx={198} ly={420} anchor="start" />
      <Edge pts={[190, 582, 190, 510]} accent label="upserts" lx={198} ly={552} anchor="start" />
      <Edge pts={[190, 646, 190, 752]} accent label="matches + timelines" lx={198} ly={690} anchor="start" />

      <Edge pts={[90, 354, 48, 354, 48, 784, 90, 784]} label="profile updates" lx={40} ly={570} rotate={-90} />
      <Edge pts={[290, 346, 312, 346, 312, 606, 290, 606]} dashed label="yield region" lx={305} ly={476} rotate={-90} />
      <Edge pts={[290, 622, 336, 622, 336, 362, 290, 362]} dashed accent label="revalidate" lx={343} ly={492} rotate={90} />
    </Svg>
  );
}

export default function ArampigArchitecture() {
  return (
    <div className="dg">
      <Wide />
      <Tall />
    </div>
  );
}
