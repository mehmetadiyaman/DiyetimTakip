import { StyleSheet } from 'react-native';
import theme from './theme';

// Uygulama genelinde tekrar eden ortak stiller
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.palette.text.secondary,
  },
  errorText: {
    color: theme.palette.error.main,
    textAlign: 'center',
    margin: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.md,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  text: {
    fontSize: theme.typography.fontSize.md,
    color: theme.palette.text.primary,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  },
  divider: {
    height: 1,
    backgroundColor: theme.palette.grey[300],
    marginVertical: theme.spacing.sm,
  },
  emptyMessage: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    marginVertical: theme.spacing.lg,
    fontStyle: 'italic',
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.palette.background.paper,
  },
  button: {
    marginTop: theme.spacing.md,
    borderRadius: theme.shape.borderRadius.md,
  },
  scrollView: {
    flexGrow: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  padding: {
    padding: theme.spacing.md,
  },
  margin: {
    margin: theme.spacing.md,
  },
  primaryText: {
    color: theme.palette.primary.main,
  },
  secondaryText: {
    color: theme.palette.secondary.main,
  },
  errorText: {
    color: theme.palette.error.main,
  },
  warningText: {
    color: theme.palette.warning.main,
  },
  infoText: {
    color: theme.palette.info.main,
  },
  successText: {
    color: theme.palette.success.main,
  },
});

export default commonStyles; 