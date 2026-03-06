<script lang="ts">
  /**
   * Thin wrapper around phosphor-svelte icons.
   * Maps a string `name` to the corresponding Phosphor component.
   * This avoids scattering individual Phosphor imports across every consumer.
   *
   * Usage: <Icon name="star" size={20} weight="fill" />
   */
  import Star from 'phosphor-svelte/lib/Star';
  import Heart from 'phosphor-svelte/lib/Heart';
  import PushPin from 'phosphor-svelte/lib/PushPin';
  import Play from 'phosphor-svelte/lib/Play';
  import Pause from 'phosphor-svelte/lib/Pause';
  import Funnel from 'phosphor-svelte/lib/Funnel';
  import CaretDown from 'phosphor-svelte/lib/CaretDown';
  import CaretRight from 'phosphor-svelte/lib/CaretRight';
  import ExportIcon from 'phosphor-svelte/lib/Export';
  import X from 'phosphor-svelte/lib/X';
  import Plus from 'phosphor-svelte/lib/Plus';
  import Check from 'phosphor-svelte/lib/Check';
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
  import Trash from 'phosphor-svelte/lib/Trash';
  import BookmarkSimple from 'phosphor-svelte/lib/BookmarkSimple';
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
  import SpeakerHigh from 'phosphor-svelte/lib/SpeakerHigh';
  import SlidersHorizontal from 'phosphor-svelte/lib/SlidersHorizontal';
  import User from 'phosphor-svelte/lib/User';
  import Users from 'phosphor-svelte/lib/Users';
  import Globe from 'phosphor-svelte/lib/Globe';
  import Info from 'phosphor-svelte/lib/Info';
  import Minus from 'phosphor-svelte/lib/Minus';
  import Pencil from 'phosphor-svelte/lib/Pencil';
  import Desktop from 'phosphor-svelte/lib/Desktop';
  import Microphone from 'phosphor-svelte/lib/Microphone';
  import ChatCircle from 'phosphor-svelte/lib/ChatCircle';
  import CaretUp from 'phosphor-svelte/lib/CaretUp';
  import Gear from 'phosphor-svelte/lib/Gear';
  import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
  import Key from 'phosphor-svelte/lib/Key';
  import Waveform from 'phosphor-svelte/lib/Waveform';
  import Lightning from 'phosphor-svelte/lib/Lightning';
  import Folder from 'phosphor-svelte/lib/Folder';

  export let name: string;
  export let size: number = 16;
  export let weight: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' = 'regular';

  const iconMap: Record<string, typeof Star> = {
    star: Star,
    'star-filled': Star,
    heart: Heart,
    'heart-filled': Heart,
    pin: PushPin,
    'pin-filled': PushPin,
    play: Play,
    pause: Pause,
    filter: Funnel,
    'chevron-down': CaretDown,
    'chevron-right': CaretRight,
    export: ExportIcon,
    x: X,
    plus: Plus,
    check: Check,
    'arrow-left': ArrowLeft,
    trash: Trash,
    bookmark: BookmarkSimple,
    'bookmark-filled': BookmarkSimple,
    search: MagnifyingGlass,
    speaker: SpeakerHigh,
    sliders: SlidersHorizontal,
    user: User,
    users: Users,
    globe: Globe,
    info: Info,
    minus: Minus,
    pencil: Pencil,
    desktop: Desktop,
    microphone: Microphone,
    chat: ChatCircle,
    'chevron-up': CaretUp,
    gear: Gear,
    'arrow-right': ArrowRight,
    key: Key,
    waveform: Waveform,
    lightning: Lightning,
    folder: Folder
  };

  const filledNames = new Set([
    'star-filled',
    'heart-filled',
    'pin-filled',
    'bookmark-filled'
  ]);

  $: component = iconMap[name] ?? Star;
  $: resolvedWeight = filledNames.has(name) ? 'fill' : weight;
</script>

<svelte:component
  this={component}
  {size}
  weight={resolvedWeight}
  aria-hidden="true"
  {...$$restProps}
/>
