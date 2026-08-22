import { Box, Text } from 'ink';

export interface ProbeProps {
  label: string;
}

/** Temporary Phase 0 smoke component; removed once the real shell lands. */
export function Probe({ label }: ProbeProps) {
  return (
    <Box borderStyle="round" paddingX={1}>
      <Text bold color="green">
        {label}
      </Text>
    </Box>
  );
}
