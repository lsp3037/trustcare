/**
 * @deprecated Use `@/lib/design/status` diretamente, ou o componente
 * `<StatusBadge>` de `@/components/ui`.
 *
 * Este arquivo virou um adaptador fino sobre a fonte única para não
 * quebrar os imports existentes durante a migração. Some quando o
 * último consumidor for migrado.
 */
import { STATUS, getStatusClasses, getStatusDot } from '@/lib/design/status';

export const STATUS_CONFIG = STATUS;

export const getStatusColor = (status: string) => getStatusClasses(status);

export const getStatusDotColor = (status: string) => getStatusDot(status);
