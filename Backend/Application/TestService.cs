using Application.DTO.Create;
using AutoMapper;
using Domain;
using FluentValidation;

namespace Application;

public class TestService : ITestService
{
    private readonly ITestRepository _testRepository;
    private readonly IMapper _mapper;
    private readonly IValidator<TestCreateDTO> _validator;
    public TestService(ITestRepository testRepository, IMapper mapper, IValidator<TestCreateDTO> validator)
    {
        _testRepository = testRepository;
        _mapper = mapper;
        _validator = validator;
       
    }
    public Test Test(TestCreateDTO inputTest)
    {
        var validation = _validator.Validate(inputTest);
        if (!validation.IsValid)
        {
            throw new ValidationException(validation.ToString());
        }
        var processedTest = _mapper.Map<Test>(inputTest);
        return _testRepository.Create(processedTest);
    }

    public List<Test> GetTests()
    {
        return _testRepository.ReadAll();
    }

    public Test GetTestById(int id)
    {
        if (id <= 0)
        {
            throw new IndexOutOfRangeException("Id cannot be negative or zero.");
        }
        var toReturn = _testRepository.Read(id);
        if (toReturn == null)
        {
            throw new NullReferenceException("Test does not exist with ID "+id);
        }
        return toReturn;
    }

    public bool DeleteTestById(int id)
    {
        if (id <= 0)
        {
            throw new IndexOutOfRangeException("Id cannot be negative or zero.");
        }
        var toReturn = _testRepository.Delete(id);
        if (toReturn == false)
        {
            throw new NullReferenceException("Couldn't Delete "+id+
                                             ", Either because the value does not exist, or some other issue.");
        }
        return toReturn;
    }
}