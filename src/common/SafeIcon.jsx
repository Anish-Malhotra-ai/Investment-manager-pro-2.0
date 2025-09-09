import React from 'react';

const SafeIcon = ({ icon: IconComponent, className = '', ...props }) => {
  if (!IconComponent) {
    // Fallback if icon doesn't exist
    return (
      <span 
        className={`inline-block w-4 h-4 bg-gray-500 ${className}`} 
        {...props}
        title="Icon not available"
      />
    );
  }

  try {
    return <IconComponent className={className} {...props} />;
  } catch (error) {
    console.warn('Error rendering icon:', error);
    return (
      <span 
        className={`inline-block w-4 h-4 bg-gray-500 ${className}`} 
        {...props}
        title="Icon error"
      />
    );
  }
};

export default SafeIcon;