export class AddMemberDto {
  email: string;
  role?: string; // 'admin' | 'member', defaults to 'member'
}

