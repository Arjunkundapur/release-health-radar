import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DimensionValue } from 'react-native';

type PlatformName = 'iOS' | 'Android';
type ReleaseStatus = 'healthy' | 'watch' | 'pause';
type TabKey = 'health' | 'anomalies' | 'pipeline';

type Release = {
  id: string;
  label: string;
  channel: string;
  platform: PlatformName;
  rollout: number;
  sessions: number;
  crashes: number;
  p95StartupMs: number;
  baselineCrashRate: number;
  schemaErrors: number;
  duplicateEvents: number;
  lateEvents: number;
};

const releases: Release[] = [
  {
    id: 'r-143-ios',
    label: 'v1.4.3',
    channel: 'production',
    platform: 'iOS',
    rollout: 34,
    sessions: 18420,
    crashes: 61,
    p95StartupMs: 1380,
    baselineCrashRate: 0.0041,
    schemaErrors: 13,
    duplicateEvents: 41,
    lateEvents: 128,
  },
  {
    id: 'r-143-android',
    label: 'v1.4.3',
    channel: 'production',
    platform: 'Android',
    rollout: 18,
    sessions: 9730,
    crashes: 112,
    p95StartupMs: 2140,
    baselineCrashRate: 0.0053,
    schemaErrors: 74,
    duplicateEvents: 206,
    lateEvents: 382,
  },
  {
    id: 'r-142-ios',
    label: 'v1.4.2',
    channel: 'production',
    platform: 'iOS',
    rollout: 100,
    sessions: 64320,
    crashes: 239,
    p95StartupMs: 1510,
    baselineCrashRate: 0.0045,
    schemaErrors: 28,
    duplicateEvents: 167,
    lateEvents: 294,
  },
  {
    id: 'r-142-android',
    label: 'v1.4.2',
    channel: 'production',
    platform: 'Android',
    rollout: 100,
    sessions: 52890,
    crashes: 319,
    p95StartupMs: 1880,
    baselineCrashRate: 0.0057,
    schemaErrors: 41,
    duplicateEvents: 197,
    lateEvents: 331,
  },
];

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'health', label: 'Health' },
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'pipeline', label: 'Pipeline' },
];

function crashRate(release: Release) {
  return release.crashes / release.sessions;
}

function dataQualityScore(release: Release) {
  const badEvents = release.schemaErrors + release.duplicateEvents + release.lateEvents;
  const penalty = Math.min(28, (badEvents / release.sessions) * 1200);
  return Math.round(100 - penalty);
}

function healthScore(release: Release) {
  const crashPenalty = Math.min(48, (crashRate(release) / release.baselineCrashRate - 1) * 32);
  const startupPenalty = Math.max(0, (release.p95StartupMs - 1600) / 55);
  const qualityPenalty = 100 - dataQualityScore(release);
  return Math.max(0, Math.round(96 - crashPenalty - startupPenalty - qualityPenalty * 0.4));
}

function releaseStatus(release: Release): ReleaseStatus {
  const score = healthScore(release);
  const crashLift = crashRate(release) / release.baselineCrashRate;

  if (score < 70 || (crashLift > 1.5 && release.rollout > 10)) {
    return 'pause';
  }

  if (score < 84 || crashLift > 1.2) {
    return 'watch';
  }

  return 'healthy';
}

function recommendation(release: Release) {
  const status = releaseStatus(release);
  const lift = crashRate(release) / release.baselineCrashRate;

  if (status === 'pause') {
    return `Pause rollout: ${release.platform} crash rate is ${lift.toFixed(1)}x baseline at ${release.rollout}% adoption.`;
  }

  if (status === 'watch') {
    return `Hold at ${release.rollout}% and monitor the next 2k sessions before expanding.`;
  }

  return 'Continue rollout: health is stable and data quality is within tolerance.';
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function statusColor(status: ReleaseStatus) {
  if (status === 'pause') return '#d04437';
  if (status === 'watch') return '#b7791f';
  return '#207a4c';
}

export default function App() {
  const [selectedTab, setSelectedTab] = useState<TabKey>('health');
  const selectedRelease = useMemo(
    () => releases.find((release) => releaseStatus(release) === 'pause') ?? releases[0],
    [],
  );

  const releaseScores = releases.map((release) => ({
    ...release,
    crash: crashRate(release),
    quality: dataQualityScore(release),
    score: healthScore(release),
    status: releaseStatus(release),
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Expo release observability</Text>
            <Text style={styles.title}>Release Health Radar</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live demo</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Turns EAS Update and mobile telemetry into rollout decisions a data team can trust.
        </Text>

        <View style={styles.heroGrid}>
          <MetricBlock label="Tracked sessions" value="145k" detail="+12.4k since deploy" />
          <MetricBlock label="Risky release" value={selectedRelease.label} detail={selectedRelease.platform} />
          <MetricBlock label="Action" value="Pause" detail="Android rollout" danger />
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = selectedTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTab === 'health' && <HealthView releaseScores={releaseScores} />}
        {selectedTab === 'anomalies' && <AnomalyView releaseScores={releaseScores} />}
        {selectedTab === 'pipeline' && <PipelineView selectedRelease={selectedRelease} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBlock({
  label,
  value,
  detail,
  danger,
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.metricBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger && styles.metricValueDanger]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function HealthView({
  releaseScores,
}: {
  releaseScores: Array<Release & { crash: number; quality: number; score: number; status: ReleaseStatus }>;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Release health</Text>
        <Text style={styles.sectionHint}>Score blends crashes, startup latency, rollout, and event quality.</Text>
      </View>

      {releaseScores.map((release) => (
        <View key={release.id} style={styles.releaseCard}>
          <View style={styles.releaseTopRow}>
            <View>
              <Text style={styles.releaseName}>
                {release.label} - {release.platform}
              </Text>
              <Text style={styles.releaseMeta}>
                {release.channel} | {release.rollout}% rollout | {formatNumber(release.sessions)} sessions
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor(release.status)}18` }]}>
              <Text style={[styles.statusText, { color: statusColor(release.status) }]}>
                {release.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{release.score}</Text>
              <Text style={styles.scoreLabel}>health</Text>
            </View>
            <View style={styles.scoreDetails}>
              <Bar label="Crash rate" value={release.crash} max={0.014} color={statusColor(release.status)} />
              <Bar label="Baseline" value={release.baselineCrashRate} max={0.014} color="#52708f" muted />
            </View>
          </View>

          <View style={styles.releaseStats}>
            <Stat label="Crash rate" value={formatPercent(release.crash)} />
            <Stat label="p95 startup" value={`${release.p95StartupMs}ms`} />
            <Stat label="Data quality" value={`${release.quality}/100`} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AnomalyView({
  releaseScores,
}: {
  releaseScores: Array<Release & { crash: number; quality: number; score: number; status: ReleaseStatus }>;
}) {
  const anomalies = releaseScores
    .filter((release) => release.status !== 'healthy')
    .map((release) => ({
      id: release.id,
      title:
        release.status === 'pause'
          ? `${release.platform} rollout crossed rollback threshold`
          : `${release.platform} release needs monitoring`,
      body: recommendation(release),
      severity: release.status,
    }));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Anomaly feed</Text>
        <Text style={styles.sectionHint}>Explainable rules make the data product interviewable.</Text>
      </View>

      {anomalies.map((anomaly) => (
        <View key={anomaly.id} style={styles.anomalyRow}>
          <View style={[styles.severityRail, { backgroundColor: statusColor(anomaly.severity) }]} />
          <View style={styles.anomalyContent}>
            <Text style={styles.anomalyTitle}>{anomaly.title}</Text>
            <Text style={styles.anomalyBody}>{anomaly.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.ruleBox}>
        <Text style={styles.ruleTitle}>Rollback rule</Text>
        <Text style={styles.ruleText}>
          Pause when crash rate is above 1.5x baseline after 10% rollout, or when the blended
          health score falls below 70.
        </Text>
      </View>
    </View>
  );
}

function PipelineView({ selectedRelease }: { selectedRelease: Release }) {
  const validationRows = [
    { label: 'Schema errors', value: selectedRelease.schemaErrors, limit: 40 },
    { label: 'Duplicate events', value: selectedRelease.duplicateEvents, limit: 120 },
    { label: 'Late arrivals', value: selectedRelease.lateEvents, limit: 260 },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Event pipeline</Text>
        <Text style={styles.sectionHint}>A mobile-data lens: validate, dedupe, aggregate, decide.</Text>
      </View>

      <View style={styles.pipeline}>
        {['App event', 'Validator', 'Dedupe', 'Aggregator', 'Decision'].map((step, index) => (
          <View key={step} style={styles.pipelineStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {validationRows.map((row) => {
        const hot = row.value > row.limit;
        return (
          <View key={row.label} style={styles.validationRow}>
            <View>
              <Text style={styles.validationLabel}>{row.label}</Text>
              <Text style={styles.validationHint}>Limit: {row.limit}</Text>
            </View>
            <Text style={[styles.validationValue, hot && styles.validationValueHot]}>{row.value}</Text>
          </View>
        );
      })}

      <View style={styles.recommendationBox}>
        <Text style={styles.recommendationLabel}>Recommendation</Text>
        <Text style={styles.recommendationText}>{recommendation(selectedRelease)}</Text>
      </View>
    </View>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  muted,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  muted?: boolean;
}) {
  const width = `${Math.max(4, Math.min(100, (value / max) * 100))}%` as DimensionValue;

  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{formatPercent(value)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: muted ? '#9aaabd' : color }]} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  page: {
    padding: 18,
    paddingBottom: 36,
    maxWidth: Platform.OS === 'web' ? 920 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    color: '#52708f',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#101820',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: '#e7f5ed',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveDot: {
    backgroundColor: '#207a4c',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  liveText: {
    color: '#207a4c',
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: '#40566d',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 12,
  },
  heroGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
    marginTop: 20,
  },
  metricBlock: {
    backgroundColor: '#ffffff',
    borderColor: '#dde7f1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  metricLabel: {
    color: '#6f8296',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#101820',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  metricValueDanger: {
    color: '#d04437',
  },
  metricDetail: {
    color: '#52708f',
    fontSize: 13,
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: '#dfe8f2',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    marginTop: 18,
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#52708f',
    fontSize: 14,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#101820',
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#101820',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#52708f',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  releaseCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde7f1',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  releaseTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  releaseName: {
    color: '#101820',
    fontSize: 18,
    fontWeight: '800',
  },
  releaseMeta: {
    color: '#52708f',
    fontSize: 13,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: '#101820',
    borderRadius: 8,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  scoreValue: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#b9c7d6',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreDetails: {
    flex: 1,
    gap: 10,
  },
  barBlock: {
    gap: 5,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    color: '#40566d',
    fontSize: 12,
    fontWeight: '700',
  },
  barValue: {
    color: '#40566d',
    fontSize: 12,
    fontWeight: '700',
  },
  barTrack: {
    backgroundColor: '#edf2f7',
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 999,
    height: 9,
  },
  releaseStats: {
    borderTopColor: '#edf2f7',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: '#6f8296',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#101820',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  anomalyRow: {
    backgroundColor: '#ffffff',
    borderColor: '#dde7f1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  severityRail: {
    width: 6,
  },
  anomalyContent: {
    flex: 1,
    padding: 14,
  },
  anomalyTitle: {
    color: '#101820',
    fontSize: 16,
    fontWeight: '800',
  },
  anomalyBody: {
    color: '#40566d',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  ruleBox: {
    backgroundColor: '#eef6ff',
    borderColor: '#c9dff7',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    padding: 14,
  },
  ruleTitle: {
    color: '#183d62',
    fontSize: 15,
    fontWeight: '900',
  },
  ruleText: {
    color: '#2e557c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  pipeline: {
    gap: 9,
    marginBottom: 14,
  },
  pipelineStep: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde7f1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: '#101820',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepText: {
    color: '#101820',
    fontSize: 15,
    fontWeight: '800',
  },
  validationRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde7f1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
    padding: 14,
  },
  validationLabel: {
    color: '#101820',
    fontSize: 15,
    fontWeight: '800',
  },
  validationHint: {
    color: '#6f8296',
    fontSize: 12,
    marginTop: 3,
  },
  validationValue: {
    color: '#207a4c',
    fontSize: 22,
    fontWeight: '900',
  },
  validationValueHot: {
    color: '#d04437',
  },
  recommendationBox: {
    backgroundColor: '#fff8eb',
    borderColor: '#f3d9a6',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    padding: 14,
  },
  recommendationLabel: {
    color: '#7a4f08',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  recommendationText: {
    color: '#4d3714',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 5,
  },
});
