'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { api, BACKEND_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const profileSchema = z.object({
  nickname: z.string().max(50, 'Nickname must be 50 characters or less').optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * EditProfileModal: Modal for editing user profile
 *
 * Features:
 * - react-hook-form + zod validation
 * - Avatar IPFS upload (optional)
 * - Nickname and bio editing
 * - PATCH /users/me to update profile
 * - authStore.updateUser() to sync state
 */
export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user, updateUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl || null,
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user?.nickname || '',
      bio: user?.bio || '',
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  // Handle avatar file change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setAvatarError('File size must be 5MB or less');
        return;
      }
      setAvatarError(null);
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit form — only send changed fields
  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatePayload: Record<string, string | null> = {};

      // Nickname: include only if changed
      const newNickname = data.nickname || null;
      if (newNickname !== (user?.nickname || null)) {
        updatePayload.nickname = newNickname;
      }

      // Bio: include only if changed
      const newBio = data.bio || null;
      if (newBio !== (user?.bio || null)) {
        updatePayload.bio = newBio;
      }

      // Avatar: include only if a new file is uploaded
      if (avatarFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadResponse = await fetch(`${BACKEND_URL}/ipfs/upload/image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar');
        }

        const uploadResult = await uploadResponse.json();
        updatePayload.avatarUrl = uploadResult.httpUrl;
        setUploading(false);
      }

      // Close immediately if no changes
      if (Object.keys(updatePayload).length === 0) {
        toast.success('No changes to save');
        onOpenChange(false);
        return;
      }

      const result = await api.patch<{
        user: {
          id: string;
          address: string;
          nickname: string | null;
          bio: string | null;
          avatarUrl: string | null;
        };
      }>('/users/me', updatePayload);

      // Update auth store
      updateUser({
        nickname: result.user.nickname,
        bio: result.user.bio,
        avatarUrl: result.user.avatarUrl,
      });

      toast.success('Profile updated successfully');
      onOpenChange(false);

      window.location.reload();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              Avatar
            </label>
            <div className="mt-2 flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Upload className="h-8 w-8" />
                  </div>
                )}
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute right-0 top-0 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                  ref={fileInputRef}
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Choose Image
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, GIF (max 5MB)
                </p>
              </div>
            </div>
            {avatarError && (
              <p className="mt-1 text-sm text-destructive">
                {avatarError}
              </p>
            )}
          </div>

          {/* Nickname */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-foreground"
            >
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              {...form.register('nickname')}
              className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter your nickname"
            />
            {errors.nickname && (
              <p className="mt-1 text-sm text-destructive">
                {errors.nickname.message}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-foreground"
            >
              Bio
            </label>
            <textarea
              id="bio"
              {...form.register('bio')}
              rows={4}
              className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Tell us about yourself"
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploading}
              className="flex-1"
            >
              {isSubmitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
