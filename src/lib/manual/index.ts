import s01 from './01-quickstart';
import s02 from './02-product';
import s03 from './03-group';
import s04 from './04-inspection';
import s05 from './05-preset';
import s06 from './06-merge';
import s07 from './07-recognize';
import s08 from './08-work';
import s09 from './09-io';
import s10 from './10-shortcut';
import s11 from './11-faq';

export interface ManualSection {
  id: string;
  title: string;
  content: string;
}

export const MANUAL_SECTIONS: ManualSection[] = [
  s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11,
];
