export type AOChannel = {
  id: string; title: string; desc?: string; thumb?: string; videoCount?: number;
};
export type AOCluster = {
  id: string; label: string; span: 1|2|3|4;
  channels: Array<{ id: string; size: 'xs'|'sm'|'md'|'lg' }>;
};
export type AOResponse = { builtAt: string; clusters: AOCluster[] };
