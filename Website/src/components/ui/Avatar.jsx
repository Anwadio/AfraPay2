import React from 'react';
import { cn } from '../../utils';

/**
 * Avatar Component
 * Display user profile pictures or initials
 */
const Avatar = React.forwardRef(({
  className,
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  ...props
}, ref) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-medium overflow-hidden',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <span className="select-none">
          {fallback}
        </span>
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

/**
 * AvatarGroup Component
 * Display multiple avatars in a group
 */
const AvatarGroup = ({
  avatars = [],
  max = 3,
  size = 'md',
  className,
  ...props
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const getOffsetClass = () => {
    switch (size) {
      case 'xs':
        return '-space-x-1';
      case 'sm':
        return '-space-x-2';
      case 'md':
        return '-space-x-2';
      case 'lg':
        return '-space-x-3';
      case 'xl':
        return '-space-x-4';
      case '2xl':
        return '-space-x-5';
      default:
        return '-space-x-2';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center',
        getOffsetClass(),
        className
      )}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          alt={avatar.alt || `Avatar ${index + 1}`}
          fallback={avatar.fallback}
          size={size}
          className="border-2 border-white shadow-sm"
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          fallback={`+${remainingCount}`}
          size={size}
          className="border-2 border-white shadow-sm bg-neutral-200 text-neutral-700"
        />
      )}
    </div>
  );
};

/**
 * UserAvatar Component
 * Avatar with user information
 */
const UserAvatar = ({
  user,
  showName = false,
  showEmail = false,
  size = 'md',
  className,
  nameClassName,
  emailClassName,
  ...props
}) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!showName && !showEmail) {
    return (
      <Avatar
        src={user?.avatar || user?.profilePicture}
        alt={user?.name || user?.firstName}
        fallback={getInitials(user?.name || user?.firstName)}
        size={size}
        className={className}
        {...props}
      />
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <Avatar
        src={user?.avatar || user?.profilePicture}
        alt={user?.name || user?.firstName}
        fallback={getInitials(user?.name || user?.firstName)}
        size={size}
      />
      <div className="flex flex-col">
        {showName && (
          <span className={cn('text-sm font-medium text-neutral-900', nameClassName)}>
            {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User'}
          </span>
        )}
        {showEmail && (
          <span className={cn('text-xs text-neutral-500', emailClassName)}>
            {user?.email || 'No email'}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * StatusAvatar Component
 * Avatar with online/offline status indicator
 */
const StatusAvatar = ({
  user,
  status = 'offline',
  size = 'md',
  className,
  ...props
}) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-success-500';
      case 'away':
        return 'bg-warning-500';
      case 'busy':
        return 'bg-error-500';
      default:
        return 'bg-neutral-400';
    }
  };

  const getStatusSize = () => {
    switch (size) {
      case 'xs':
        return 'w-2 h-2';
      case 'sm':
        return 'w-2.5 h-2.5';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-3.5 h-3.5';
      case 'xl':
        return 'w-4 h-4';
      case '2xl':
        return 'w-5 h-5';
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div className={cn('relative', className)} {...props}>
      <Avatar
        src={user?.avatar || user?.profilePicture}
        alt={user?.name || user?.firstName}
        fallback={getInitials(user?.name || user?.firstName)}
        size={size}
      />
      <div
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-white',
          getStatusColor(),
          getStatusSize()
        )}
      />
    </div>
  );
};

export { Avatar, AvatarGroup, UserAvatar, StatusAvatar };