  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)}>
        <Plus className="mr-2 h-4 w-4" /> Deploy New Course
      </Button>
      {isOpen && (
        <Card className="absolute top-12 right-0 w-[350px] z-50 elevation-3">
          ...
        </Card>
      )}
    </div>
  );
