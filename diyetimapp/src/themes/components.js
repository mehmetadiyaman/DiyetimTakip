import palette from './colors';
import { spacing } from './spacing';
import { shape, shadows } from './spacing';
import { typography } from './typography';

// Button stilleri için varsayılanlar
export const buttons = {
  primary: {
    backgroundColor: palette.primary.main,
    pressedBackgroundColor: palette.primary.dark,
    textColor: palette.primary.contrastText,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: shape.borderRadius.md,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium
  },
  secondary: {
    backgroundColor: palette.secondary.main,
    pressedBackgroundColor: palette.secondary.dark,
    textColor: palette.secondary.contrastText,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: shape.borderRadius.md,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: palette.primary.main,
    borderWidth: 1,
    textColor: palette.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: shape.borderRadius.md,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium
  },
  text: {
    backgroundColor: 'transparent',
    textColor: palette.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium
  }
};

// Input stilleri için varsayılanlar
export const inputs = {
  outlined: {
    backgroundColor: palette.background.paper,
    borderColor: palette.grey[300],
    focusBorderColor: palette.primary.main,
    errorBorderColor: palette.error.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: shape.borderRadius.md,
    fontSize: typography.fontSize.md
  }
};

// Card stilleri için varsayılanlar
export const cards = {
  default: {
    backgroundColor: palette.background.paper,
    borderRadius: shape.borderRadius.md,
    padding: spacing.md,
    ...shadows.md
  },
  elevated: {
    backgroundColor: palette.background.paper,
    borderRadius: shape.borderRadius.md,
    padding: spacing.md,
    ...shadows.lg
  }
};

export default { buttons, inputs, cards }; 